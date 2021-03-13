const fs = require("fs-extra");
const path = require("path");

const sortKeys = require("sort-keys");

const debug = require("debug");
const log = debug("snakedex:generator");

const jsonRegex = "(.+)\.json$";

function wrap(snakes, length) {
	return {
		snakes,
		length,
	}
}

async function generate() {
	const snakes = [];
	const snakesById = {};
	const snakesBySnakeNumber = {};
	
	const files = await fs.readdir("../data");

	for (const file of files) {
		const match = file.match(jsonRegex);
		if (match === null) {
			log("unknown file in data directory: '%s'", file);
			continue;
		}
		
		const snake = await fs.readJson(path.resolve("../data", file));
		snake.id = match[1];

		try {
			const image = await fs.readFile(path.resolve("../image", snake.id + ".png"));

			snake.image = "./image/" + snake.id + ".png";
			await fs.outputFile("./output/image/" + snake.id + ".png", image);
		} catch (error) {
			if (error.code === "ENOENT") {
				log("snake with id '%s' has no image", snake.id);
			} else {
				throw error;
			}
		}

		const sortedSnake = sortKeys(snake, {
			deep: true,
		});

		snakes.push(sortedSnake);
		snakesById[snake.id] = sortedSnake;
		snakesBySnakeNumber[snake.snakeNumber] = sortedSnake;
	}

	const length = snakes.length;
	log("found %d snake%s", length, length === 1 ? "" : "s");

	fs.outputJson("./output/listing/all.json", wrap(snakes, length));
	fs.outputJson("./output/listing/by_id.json", wrap(snakesById, length));
	fs.outputJson("./output/listing/by_snake_number.json", wrap(snakesBySnakeNumber, length));
}
generate();