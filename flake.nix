{
  description = "The Sacred Error primitive — the same typed failure in Rust, TypeScript, Elm and Go.";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux" ];
      eachSystem = fn:
        nixpkgs.lib.genAttrs systems (s: fn (import nixpkgs { system = s; }));
    in {
      devShells = eachSystem (pkgs: {
        # Every half, because a change to one is only correct if the others
        # still agree with it.
        default = pkgs.mkShell {
          packages = [
            pkgs.go
            pkgs.cargo
            pkgs.rustc
            pkgs.clippy
            pkgs.rustfmt
            pkgs.elmPackages.elm
            pkgs.elmPackages.elm-format
            pkgs.bun
            pkgs.typescript
          ];
        };
      });
    };
}
