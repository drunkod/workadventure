{
  description = "WorkAdventure development shell for play frontend mock mode";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        repoRoot = self.outPath;
        node = pkgs.nodejs_20;

        playDevFrontMock = pkgs.writeShellApplication {
          name = "play-dev-front-mock";
          runtimeInputs = [ node ];
          text = ''
            cd "${repoRoot}/play"
            exec npm run dev-front-mock "$@"
          '';
        };

        playTest = pkgs.writeShellApplication {
          name = "play-test";
          runtimeInputs = [ node ];
          text = ''
            cd "${repoRoot}/play"
            exec npm run test "$@"
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            node
            git
            gnumake
            pkg-config
            python3
            openssl
            playDevFrontMock
            playTest
          ];

          shellHook = ''
            echo "Nix dev shell ready."
            echo "1) npm install"
            echo "2) cd play && npm run dev-front-mock"
            echo "3) cd play && npm run test"
          '';
        };

        packages = {
          inherit playDevFrontMock playTest;
          default = playDevFrontMock;
        };

        apps = {
          play-dev-front-mock = flake-utils.lib.mkApp { drv = playDevFrontMock; };
          play-test = flake-utils.lib.mkApp { drv = playTest; };
          default = flake-utils.lib.mkApp { drv = playDevFrontMock; };
        };

        checks = {
          play-scripts-exist = pkgs.runCommandNoCC "play-scripts-exist" { } ''
            grep -q '"dev-front-mock"' "${repoRoot}/play/package.json"
            grep -q '"test"' "${repoRoot}/play/package.json"
            touch "$out"
          '';
        };

        formatter = pkgs.alejandra;
      });
}
