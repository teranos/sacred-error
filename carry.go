package sacred

// "but i want sacred-error to be the one"

// A failure is built with a stack where it happens, and each layer wraps it
// with what it was doing. Those words are the why's cause chain.

// cockroachdb/errors does the carrying underneath, so the stack, the details
// and Sentry's report of them are what they were.

import (
	crdb "github.com/cockroachdb/errors"
)

// Building and wrapping. Every one of these keeps the stack of where it ran.
var (
	New       = crdb.New
	Newf      = crdb.Newf
	Wrap      = crdb.Wrap
	Wrapf     = crdb.Wrapf
	WithStack = crdb.WithStack
)

// What travels with a failure beside its message.
var (
	WithDetail         = crdb.WithDetail
	WithHint           = crdb.WithHint
	WithHintf          = crdb.WithHintf
	WithSecondaryError = crdb.WithSecondaryError
)

// Reading a failure back.
var (
	Is                      = crdb.Is
	As                      = crdb.As
	GetAllDetails           = crdb.GetAllDetails
	GetAllHints             = crdb.GetAllHints
	FlattenDetails          = crdb.FlattenDetails
	GetReportableStackTrace = crdb.GetReportableStackTrace
)

// Sentinels a caller tests for with Is.
var (
	ErrNotFound       = New("not found")
	ErrInvalidRequest = New("invalid request")
	ErrUnauthorized   = New("unauthorized")
	ErrForbidden      = New("forbidden")

	errMethodNotAllowed = New("method not allowed")
)

// IsNotFoundError is Is(err, ErrNotFound), or a message that says not found
// at its start or its end.
func IsNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	if Is(err, ErrNotFound) {
		return true
	}
	errMsg := err.Error()
	return len(errMsg) >= 9 && (errMsg == "not found" ||
		errMsg[len(errMsg)-9:] == "not found" ||
		len(errMsg) > 10 && errMsg[:10] == "not found:")
}

// NewMethodNotAllowedError names the HTTP method that was refused.
func NewMethodNotAllowedError(method string) error {
	return Wrapf(errMethodNotAllowed, "method %s not allowed", method)
}
