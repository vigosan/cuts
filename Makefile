.PHONY: install dev test typecheck build app ffmpeg

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

ffmpeg: resources/ffmpeg/ffmpeg

resources/ffmpeg/ffmpeg:
	./scripts/build-ffmpeg.sh

app: ffmpeg
	npm run app
	rm -rf "/Applications/Carousel Cutter.app"
	cp -R "dist/mac-arm64/Carousel Cutter.app" /Applications/
