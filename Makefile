.PHONY: install typecheck test reproduce core audit claims artifacts clean

install:
	npm install

typecheck:
	npm run typecheck

test:
	npm test

reproduce: core

core: install typecheck test
	npm run p1:benchmark:multi-noise
	npm run p2:benchmark
	npm run p3:benchmark
	npm run p4:benchmark

audit: claims artifacts

claims:
	bash scripts/audit_claims.sh

artifacts:
	bash scripts/audit_artifacts.sh

clean:
	rm -rf results/
