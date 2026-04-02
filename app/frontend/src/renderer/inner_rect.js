window.addEventListener("DOMContentLoaded", () => {
  const hole = document.querySelector(".screen-hole");
  const ref  = document.querySelector(".screen-cabinet");

  function update() {
    const r = ref.getBoundingClientRect();
    hole.style.left = r.left + "px";
    hole.style.top = r.top + "px";
    hole.style.width = r.width + "px";
    hole.style.height = r.height + "px";
  }

  update();
  window.addEventListener("resize", update);
});