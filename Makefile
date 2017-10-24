.PHONY : build install production watch clean

build: clean install production

install:
	yarn install --production --no-progress

production:
	babel ./src --out-dir ./dist

watch:
	babel ./src --source-maps --watch --out-dir ./dist

clean:
	rm ./dist -Rf