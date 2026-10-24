.PHONY: install dev test typecheck build app ffmpeg icon

install:
	npm install
	npx install-electron

dev:
	npm run dev

test: ffmpeg
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

icon:
	./scripts/build-icon.sh

ffmpeg: resources/ffmpeg/ffmpeg

resources/ffmpeg/ffmpeg:
	./scripts/build-ffmpeg.sh

app: ffmpeg
	npm run app
	rm -rf "/Applications/Cuts.app"
	cp -R "dist/mac-arm64/Cuts.app" /Applications/
