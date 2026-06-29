document.addEventListener("DOMContentLoaded", async () => {
  if (typeof initialiseProjectX === "function") {
    await initialiseProjectX();
  }
});