const fs = require("fs-extra");
const path = require("path");

const sortKeys = require("sort-keys");

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
		if (match === null) continue;
		
		const snake = await fs.readJson(path.resolve("../data", file));
		snake.id = match[1];

		const sortedSnake = sortKeys(snake, {
			deep: true,
		});

		snakes.push(sortedSnake);
		snakesById[snake.id] = sortedSnake;
		snakesBySnakeNumber[snake.snakeNumber] = sortedSnake;
	}

	const length = snakes.length;
	fs.outputJson("./output/listing/all.json", wrap(snakes, length));
	fs.outputJson("./output/listing/by_id.json", wrap(snakesById, length));
	fs.outputJson("./output/listing/by_snake_number.json", wrap(snakesBySnakeNumber, length));
}
generate();