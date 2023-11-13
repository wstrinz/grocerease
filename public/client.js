document
  .getElementById("groceryListImage")
  .addEventListener("change", async function (event) {
    const displayArea = document.getElementById("groceryListDisplay");
    displayArea.innerHTML = ""; // Clear the display area

    const imageFile = event.target.files[0];
    if (imageFile) {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = async () => {
        const imageData = reader.result;
        try {
          // Remove the prefix from the base64 string
          const base64Image = imageData.split(",")[1];
          await transcribeImage(base64Image);
        } catch (error) {
          hideSpinner();
          displayArea.textContent =
            "An error occurred while transcribing the image.";
          console.error(error);
        }
      };
      reader.onerror = (error) => {
        displayArea.textContent = "An error occurred while reading the image.";
        console.error(error);
      };
    }
  });

async function transcribeImage(imageData) {
  showSpinner();

  const response = await fetch("/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imagePath: imageData }), // Send the base64 image data to the server
  });

  if (!response.ok) {
    throw new Error("An error occurred while transcribing the image.");
  }

  localStorage.removeItem("groceryList");

  const data = await response.json();

  console.log("data", data);
  // Assume that data.tool_calls[0].function.arguments is the stringified version of the items array

  hideSpinner();

  if (data.error) {

    const displayArea = document.getElementById("groceryListDisplay");
    displayArea.innerHTML = ""; // Clear existing content
    displayArea.textContent = data.error;

  } else {
    const items = JSON.parse(data.text.tool_calls[0].function.arguments).items;

    const savedState = {};

    items.forEach((item) => {
      savedState[item.name] = {
        checked: false,
        category: item.category,
        name: item.name,
        emoji: item.emoji,
      };
    });

    saveState(savedState);

    console.log("got", items, data.text);

    // Update display with checkboxes
    updateDisplayWithCheckboxes(items);
  }

  return data.text; // This line can be removed if not needed
}

// Function to load the state from local storage
function loadState() {
  const storedItems = localStorage.getItem("groceryList");
  return storedItems ? JSON.parse(storedItems) : {};
}

// Function to save the state to local storage
function saveState(items) {
  localStorage.setItem("groceryList", JSON.stringify(items));
}

function showSpinner() {
  document.getElementById("spinner").style.display = "block";
}

function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}

function updateDisplayWithCheckboxes(items) {
  const displayArea = document.getElementById("groceryListDisplay");
  displayArea.innerHTML = ""; // Clear existing content

  // Load the saved state
  const savedState = loadState();

  // Create subheaders and checkboxes for each item
  items.forEach((item) => {
    // Create category header if it does not exist
    if (!document.getElementById(`category-${item.category}`)) {
      const categoryHeader = document.createElement("h2");
      categoryHeader.textContent =
        item.category.charAt(0).toUpperCase() +
        item.category.slice(1).toLowerCase() +
        " " +
        item.emoji;
      categoryHeader.id = `category-${item.category}`;
      categoryHeader.className = "title is-4"; // Bulma title class for subheaders
      displayArea.appendChild(categoryHeader);
    }

    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "field";

    const control = document.createElement("div");
    control.className = "control";
    checkboxContainer.appendChild(control);

    const label = document.createElement("label");
    label.className = "checkbox";
    label.style.display = "block";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = item.name;
    checkbox.name = item.name;
    checkbox.checked = savedState[item.name]?.checked || false; // Set the checkbox state
    checkbox.style.transform = "scale(2)";
    checkbox.style.marginRight = "1em";

    // Event listener to update the local storage when the checkbox state changes
    checkbox.addEventListener("change", function () {
      savedState[this.name] = {
        ...savedState[this.name],
        checked: this.checked,
        emoji: item.emoji,
      };
      saveState(savedState);
    });

    label.appendChild(checkbox);
    label.appendChild(
      document.createTextNode(
        item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase()
      )
    );

    control.appendChild(label);
    displayArea.appendChild(checkboxContainer);
  });

  // Save the initial state
  saveState(savedState);
}

// Call updateDisplayWithCheckboxes with the saved state when the page loads
document.addEventListener("DOMContentLoaded", (event) => {
  const savedState = loadState();
  const savedItems = Object.keys(savedState).map((key) => ({
    name: key,
    category: savedState[key].category,
    checked: savedState[key].checked,
    emoji: savedState[key].emoji,
  }));
  if (savedItems.length > 0) {
    updateDisplayWithCheckboxes(savedItems);
  }
});
