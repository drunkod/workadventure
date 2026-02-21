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
        node = pkgs.nodejs_22;

        # Helpers that run against the live working directory, not the Nix store
        # copy. We use $PWD so that node_modules installed by the developer are
        # visible at runtime.
        playDevFrontMock = pkgs.writeShellApplication {
          name = "play-dev-front-mock";
          runtimeInputs = [ node ];
          text = ''
            cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)/play"
            exec npm run dev-front-mock "$@"
          '';
        };

        playTest = pkgs.writeShellApplication {
          name = "play-test";
          runtimeInputs = [ node ];
          text = ''
            cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)/play"
            exec npm run test "$@"
          '';
        };

        playFrontMockSmoke = pkgs.writeShellApplication {
          name = "play-front-mock-smoke";
          runtimeInputs = [ node pkgs.curl pkgs.bash ];
          text = ''
            cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)/play"
            exec npm run test:front-mock-smoke "$@"
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            node
            curl
            git
            gnumake
            pkg-config
            python3
            openssl
            playDevFrontMock
            playTest
            playFrontMockSmoke
          ];

          shellHook = ''
            echo "Nix dev shell ready."
            echo "  npm install                  – install dependencies"
            echo "  play-dev-front-mock          – start frontend mock server"
            echo "  play-test                    – run unit tests"
            echo "  play-front-mock-smoke        – run smoke test (needs server)"
          '';
        };

        packages = {
          inherit playDevFrontMock playTest playFrontMockSmoke;
          default = playDevFrontMock;
        };

        apps = {
          play-dev-front-mock = flake-utils.lib.mkApp { drv = playDevFrontMock; };
          play-test = flake-utils.lib.mkApp { drv = playTest; };
          play-front-mock-smoke = flake-utils.lib.mkApp { drv = playFrontMockSmoke; };
          default = flake-utils.lib.mkApp { drv = playDevFrontMock; };
        };

        checks = {
          play-scripts-exist = pkgs.runCommandNoCC "play-scripts-exist" { } ''
            grep -q '"dev-front-mock"' "${self.outPath}/play/package.json"
            grep -q '"test"' "${self.outPath}/play/package.json"
            grep -q '"test:front-mock-smoke"' "${self.outPath}/play/package.json"
            touch "$out"
          '';
        };

        formatter = pkgs.alejandra;
      });
}
