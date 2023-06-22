

// Menu Toggle
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};

//Modal toggle

var modal = document.querySelector(".modal");
    
    // Get the button that opens the modal
    var modalBtn = document.querySelector(".modal-btn");
    
    // Get the close button element
    var closeBtn = document.querySelector(".close-btn");
    
    // When the user clicks the button, open the modal
    modalBtn.onclick = function() {
      modal.style.display = "block";
    }
    
    // When the user clicks on the close button, close the modal
    closeBtn.onclick = function() {
      modal.style.display = "none";
    }
    
    // When the user clicks outside the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

