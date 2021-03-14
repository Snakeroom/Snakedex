const fs = require("fs-extra");
const path = require("path");

const sharp = require("sharp");

const sortKeys = require("sort-keys");

const debug = require("debug");
const log = debug("snakedex:generator");

const jsonRegex = /(.+)\.json$/;

/**
 * An object mapping resize names to the widths that snake images should be resized to.
 * @type {Object<string, number>}
 */
const resizes = {
	"128x": 128,
	"256x": 256,
	"32x": 32,
	"64x": 64,
};

/**
 * @typedef {Object} Snake
 * @property {string} id
 * @property {Object<string, string>?} image
 * @property {string?} name
 * @property {number?} snakeNumber
 */

/**
 * Wraps snakes and length into an object.
 * @param {(Snake[] | Object<string, Snake>)} snakes The snakes to wrap.
 * @param {number} length The length to wrap.
 */
function wrap(snakes, length) {
	return {
		length,
		snakes,
	};
}

/**
 * Generates data.
 */
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

			snake.images = {
				full: "./image/full/" + snake.id + ".png",
			};
			await fs.outputFile("./output/image/full/" + snake.id + ".png", image);

			for (const [ resize, width ] of Object.entries(resizes)) {
				const resizedImage = await sharp(image).resize(width).toBuffer();
				snake.images[resize] = "./image/" + resize + "/" + snake.id + ".png",
				await fs.outputFile("./output/image/" + resize + "/" + snake.id + ".png", resizedImage);
			}
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