.PHONY : build install production clean

build: clean install production

install:
	yarn install --no-progress

production:
	yarn build

clean:
	rm ./dist -Rf