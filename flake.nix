{
  description = "WorkAdventure development shell for npm and local play mode";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_20
            python3
            gnumake
            gcc
            pkg-config
          ];

          shellHook = ''
            echo "Node: $(node --version)"
            echo "npm:  $(npm --version)"
            echo "Run once: npm ci"
            echo "Start local mode: cd play && npm run dev-front"
          '';
        };
      }
    );
}
