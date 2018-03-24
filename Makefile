.PHONY : build install production watch clean

build: clean install production

install:
	yarn install --no-progress

production:
	rollup -c

watch:
	rollup -c -w

clean:
	rm ./dist -Rf