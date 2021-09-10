const { getColors } = require('./lib/colors');
const veniaPlugin = require('./plugins');
/**
 * This is the main tailwindcss theme file for the Venia theme
 */

module.exports = {
    plugins: [veniaPlugin],
    theme: {
        borderColor: {},
        colors: getColors(),
        extend: {
            gridTemplateColumns: {},
            gridTemplateRows: {},
            lineHeight: {},
            maxHeight: {},
            maxWidth: {}
        },
        screens: {},
        transitionDuration: {}
    }
};
