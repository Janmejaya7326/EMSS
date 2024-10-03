let lastScrollTop = 0;
const upperNavbar = document.getElementById('upperNavbar');
const lowerNavbar = document.getElementById('lowerNavbar');
const lowerNavLinks = lowerNavbar.getElementsByTagName('a');
const scrollThreshold = 100;  // Adjust this value to control when the navbar appears
const mainContent = document.getElementById('mainContent'); // Main content area

// Function to update the active link
function setActiveLink(target) {
    for (let i = 0; i < lowerNavLinks.length; i++) {
        lowerNavLinks[i].classList.remove('active');  // Remove 'active' from all links
    }
    target.classList.add('active');  // Add 'active' to the clicked link
}

// Function to mark the correct link as active based on the current page
function updateActiveLink() {
    const currentPath = window.location.pathname.split("/").pop();  // Get the current file name
    for (let i = 0; i < lowerNavLinks.length; i++) {
        const link = lowerNavLinks[i];
        if (link.getAttribute('href') === currentPath || (link.getAttribute('href') === "home.html" && currentPath === "")) {
            link.classList.add('active');  // Mark the matching link as active
        } else {
            link.classList.remove('active');
        }
    }
}

// Call updateActiveLink when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateActiveLink();  // Update active link based on the current page

    // Handle login/logout state
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    const authLinks = document.getElementById('authLinks');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (isLoggedIn) {
        // If the user is logged in, show logout link
        authLinks.innerHTML = '<a href="#" id="logoutLink">Logout</a>';
        const logoutLink = document.getElementById('logoutLink');
        logoutLink.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'login.html';  // Redirect to login page
        });
    }
});

// Function to handle login success
function handleLoginSuccess() {
    localStorage.setItem('isLoggedIn', 'true');  // Store login state
    window.location.href = 'home.html';  // Redirect to the navbar page
}

// Listen for scroll to hide/show navbars
window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop) {
        upperNavbar.style.top = "-70px";  // Hide the upper navbar
        lowerNavbar.style.top = "0";  // Move the lower navbar to the top
        lowerNavbar.style.backgroundColor = "white";  // Change lower navbar background to white
    } else {
        if (scrollTop < scrollThreshold) {
            upperNavbar.style.top = "0";  // Show the upper navbar
            lowerNavbar.style.top = "60px";  // Move the lower navbar back below the upper navbar
        }
    }
    lastScrollTop = scrollTop;
});

document.addEventListener('DOMContentLoaded', function () {
    const signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function () {
            const isLoggedIn = localStorage.getItem('isLoggedIn');  // Check if user is logged in

            if (isLoggedIn) {
                alert('You are already logged in!');
            } else {
                window.location.href = 'signup.html';  // Redirect to sign-up page if not logged in
            }
        });
    }
});