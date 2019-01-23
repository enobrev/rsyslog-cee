.PHONY : build install production watch clean

build: clean install production

install:
	yarn install --no-progress

production:
	yarn build

watch:
	yarn watch

clean:
	rm ./dist -Rf