// console.log('%c🚧 Website is under construction 🚧', "font-size: 32px");

const menuContainer = document.querySelector('.main-navigation-mobile');
const menuOpenBtn = menuContainer.querySelector('.menu-toggle-btn');
const menuCloseBtn = menuContainer.querySelector('.menu-close-btn');

menuOpenBtn.addEventListener('click', toggleMenu);
menuCloseBtn.addEventListener('click', toggleMenu);

function toggleMenu() {
  menuContainer.classList.toggle('opened');
}