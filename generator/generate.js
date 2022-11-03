const fs = require("fs-extra");
const path = require("node:path");

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
 * @param {Snake} a The first snake to compare.
 * @param {Snake} b The second snake to compare.
 */
function compareSnakes(a, b) {
	if (!a.firstAppearance || !a.firstAppearance.date) return -1;
	if (!b.firstAppearance || !b.firstAppearance.date) return 1;

	const dateCompare = new Date(a.firstAppearance.date) - new Date(b.firstAppearance.date);
	if (dateCompare === 0 && a.firstAppearance.order && b.firstAppearance.order) {
		return a.firstAppearance.order - b.firstAppearance.order;
	}

	return dateCompare;
}

/**
 * Gets a list of snakes sorted by first appearance date.
 * These snakes lack generated data except for their ID,
 * which is inferred from the file name.
 */
async function getRawSnakes() {
	const files = await fs.readdir("../data");
	const rawSnakes = [];

	for (const file of files) {
		const match = file.match(jsonRegex);
		if (match === null) {
			log("unknown file in data directory: '%s'", file);
			continue;
		}

		const rawSnake = await fs.readJson(path.resolve("../data", file));
		rawSnake.id = match[1];

		rawSnakes.push(rawSnake);
	}

	return rawSnakes.sort(compareSnakes);
}

/**
 * Generates data.
 */
async function generate() {
	const snakes = [];
	const snakesById = {};
	const snakesBySnakeNumber = {};

	const rawSnakes = await getRawSnakes();
	let snakeNumber = 1;
	for (const snake of rawSnakes) {
		snake.snakeNumber = snakeNumber;

		try {
			const image = await fs.readFile(path.resolve("../image", snake.id + ".png"));

			snake.images = {
				full: "image/full/" + snake.id + ".png",
			};
			await fs.outputFile("./output/image/full/" + snake.id + ".png", image);

			for (const [ resize, width ] of Object.entries(resizes)) {
				const resizedImage = await sharp(image)
					.resize(width)
					.toBuffer();

				snake.images[resize] = "image/" + resize + "/" + snake.id + ".png",
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

		snakeNumber += 1;
	}

	const length = snakes.length;
	log("found %d snake%s", length, length === 1 ? "" : "s");

	fs.outputJson("./output/listing/all.json", wrap(snakes, length));
	fs.outputJson("./output/listing/by_id.json", wrap(snakesById, length));
	fs.outputJson("./output/listing/by_snake_number.json", wrap(snakesBySnakeNumber, length));
}
/* eslint-disable-next-line unicorn/prefer-top-level-await */
generate();
