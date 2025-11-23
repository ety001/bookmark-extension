/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './entrypoints/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  // Tailwind CSS 4.x 的主题配置主要在 CSS 文件中使用 @theme
  // 这里只保留 content 配置用于扫描类名
};

