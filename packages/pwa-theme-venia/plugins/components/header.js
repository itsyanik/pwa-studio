const addRulesets = ({ addComponents }) => {
    addComponents({
        '.header': {
            backgroundColor: 'rgb(var(--venia-global-color-gray-50))',
            boxShadow: '0 2px rgb(var(--venia-global-color-gray-100))'
        }
    });
};

const ID = 'header';
module.exports = [ID, addRulesets];
