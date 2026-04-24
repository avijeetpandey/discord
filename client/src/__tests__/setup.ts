import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView or scrollTo
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.scrollTo = () => {};
