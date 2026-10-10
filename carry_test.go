package sacred

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Each layer's words stay in the message, outermost first, and the failure
// underneath is still the one Is finds.
func TestEveryLayerIsKept(t *testing.T) {
	base := New("connection refused")
	err := Wrapf(base, "failed to dial %s", "db:5432")
	err = Wrap(err, "failed to open the store")

	assert.Equal(t, "failed to open the store: failed to dial db:5432: connection refused", err.Error())
	assert.True(t, Is(err, base))
	assert.False(t, Is(err, New("connection reset")))
}

// Is matches by type and message, not by pointer: a failure built with the
// same words is the same failure, across a process boundary too.
func TestIsMatchesTheSameWords(t *testing.T) {
	err := Wrap(New("connection refused"), "failed to dial")
	assert.True(t, Is(err, New("connection refused")))
}

// The stack is where the failure was built, not where it was read.
func TestTheStackNamesWhereItWasBuilt(t *testing.T) {
	err := Newf("failed at %d", 42)
	assert.Contains(t, fmt.Sprintf("%+v", err), "carry_test.go")
	assert.NotNil(t, GetReportableStackTrace(err))
}

type shapeless struct{ msg string }

func (e *shapeless) Error() string { return e.msg }

// A typed failure stays reachable under any number of wraps.
func TestAsFindsTheTypeUnderWraps(t *testing.T) {
	err := Wrap(Wrap(&shapeless{msg: "custom"}, "inner"), "outer")
	var found *shapeless
	require.True(t, As(err, &found))
	assert.Equal(t, "custom", found.msg)
}

// Details and hints travel beside the message through later wraps.
func TestDetailsAndHintsTravel(t *testing.T) {
	err := WithDetail(New("refused"), "namespace=p")
	err = WithHintf(err, "grant %s first", "REACH")
	err = WithHint(err, "or ask the root")
	err = Wrap(err, "failed to answer")

	assert.Equal(t, []string{"namespace=p"}, GetAllDetails(err))
	assert.Equal(t, "namespace=p", FlattenDetails(err))
	assert.Equal(t, []string{"grant REACH first", "or ask the root"}, GetAllHints(err))
}

// A second failure met while handling the first is carried, not dropped.
func TestASecondaryFailureIsCarried(t *testing.T) {
	err := WithSecondaryError(New("write failed"), New("rollback failed"))
	assert.Contains(t, fmt.Sprintf("%+v", err), "rollback failed")
}

// Wrapping nothing is nothing: there is no failure to carry.
func TestWrappingNilIsNil(t *testing.T) {
	assert.Nil(t, Wrap(nil, "context"))
	assert.Nil(t, Wrapf(nil, "context %d", 1))
	assert.Nil(t, WithStack(nil))
	assert.Nil(t, WithDetail(nil, "detail"))
	assert.Nil(t, WithHint(nil, "hint"))
}

func TestSentinels(t *testing.T) {
	assert.True(t, Is(Wrap(ErrNotFound, "user p"), ErrNotFound))
	assert.True(t, Is(Wrap(ErrInvalidRequest, "body"), ErrInvalidRequest))
	assert.True(t, Is(Wrap(ErrUnauthorized, "token"), ErrUnauthorized))
	assert.True(t, Is(Wrap(ErrForbidden, "reach"), ErrForbidden))
	assert.Equal(t, "method DELETE not allowed: method not allowed", NewMethodNotAllowedError("DELETE").Error())
}

func TestIsNotFoundError(t *testing.T) {
	assert.False(t, IsNotFoundError(nil))
	assert.True(t, IsNotFoundError(Wrap(ErrNotFound, "user p")))
	assert.True(t, IsNotFoundError(New("user p not found")))
	assert.True(t, IsNotFoundError(New("not found: user p")))
	assert.False(t, IsNotFoundError(New("found")))
}
