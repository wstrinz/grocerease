function groceryListApp() {
  return {
    loading: false,
    error: "",
    items: [],

    init() {
      // Initialization logic here
      const savedState = this.loadState();
      const savedItems = Object.keys(savedState).map((key) => ({
        name: key,
        category: savedState[key].category,
        checked: savedState[key].checked,
        emoji: savedState[key].emoji,
      }));
      this.items = savedItems;
    },

    handleImageChange(event) {
      this.error = ''; // Clear any previous error.
      const imageFile = event.target.files[0];
      if (imageFile) {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = async () => {
          try {
            const imageData = reader.result.split(",")[1];
            await this.transcribeImage(imageData);
          } catch (error) {
            this.loading = false;
            this.error = "An error occurred while transcribing the image.";
            console.error(error);
          }
        };
        reader.onerror = error => {
          this.loading = false;
          this.error = "An error occurred while reading the image.";
          console.error(error);
        };
      }
    },


    async transcribeImage(imageData) {
      this.loading = true;

      try {
        const response = await fetch("/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imagePath: imageData }),
        });

        if (!response.ok) {
          throw new Error("Server responded with an error.");
        }

        const data = await response.json();
        this.items = JSON.parse(data.text.tool_calls[0].function.arguments).items;
        this.saveState(this.items);
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.error = error.message;
        console.error(error);
      }
    },

    // Function to load the state from local storage
    loadState() {
      const storedItems = localStorage.getItem("groceryList");
      return storedItems ? JSON.parse(storedItems) : {};
    },

    // Function to save the state to local storage
    saveState(items) {
      localStorage.setItem("groceryList", JSON.stringify(items));
    },

    updateDisplayWithCheckboxes() {
      // Instead of manually updating the DOM,
      // you'll manipulate this.items and use x-for in your HTML to render the list
    },

    // ... additional methods as needed ...
  };
}
