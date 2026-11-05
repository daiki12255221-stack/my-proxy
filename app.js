const form = document.querySelector("#proxy-form");
const input = document.querySelector("#url");
const button = form.querySelector("button");
const message = document.querySelector("#message");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();

  let url;
  try {
    url = new URL(value);
  } catch {
    message.textContent = "URLの形式を確認してください。";
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    message.textContent = "HTTPまたはHTTPSのURLを入力してください。";
    return;
  }

  button.disabled = true;
  message.textContent = "ページを開いています…";
  window.location.href = `/api/proxy?url=${encodeURIComponent(url.toString())}`;
});
