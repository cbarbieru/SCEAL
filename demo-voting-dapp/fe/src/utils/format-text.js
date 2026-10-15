export const camelToFlat = c => {
    if (!c) {
        return "";
    }
    return c = c.replace(/[A-Z]/g, " $&"), c[0].toUpperCase() + c.slice(1);
};