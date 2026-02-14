const prexit = (fn) => {
    return new Promise((resolve) => {
        fn()
            .then(() => { })
            .catch((err) => console.error('Error:', err))
            .finally(() => resolve());
    });
};
export default prexit;
//# sourceMappingURL=prexit.js.map