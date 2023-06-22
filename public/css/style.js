const navbarHeight = document.querySelector('.navbar').offsetHeight;
const messagesElement = document.querySelector('ul.messages');
messagesElement.style.top = `${navbarHeight}px`;
