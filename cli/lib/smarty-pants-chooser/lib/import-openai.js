'use strict';
module.exports = async function(callback) {
	const openAi = await import('openai');
	callback('', openAi);
};
