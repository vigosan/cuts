.PHONY: install dev test typecheck build app

install:
	npm install
	npx install-electron

dev:
	npm run dev

test:
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

app:
	npm run app
	rm -rf "/Applications/Carousel Cutter.app"
	cp -R "dist/mac-arm64/Carousel Cutter.app" /Applications/
