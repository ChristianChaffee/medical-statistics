const colorInput = document.getElementById('colorInput');
const colorPreview = document.getElementById('colorPreview');
const colorValue = document.getElementById('colorValue');

// Устанавливаем начальный цвет
colorPreview.style.backgroundColor = colorInput.value;

// Обработчик изменения цвета
colorInput.addEventListener('input', (event) => {
    const selectedColor = event.target.value;
    colorPreview.style.backgroundColor = selectedColor;
    colorValue.textContent = selectedColor;
    
    // Можно отправить цвет в main process если нужно
    window.electronAPI.saveColor(selectedColor);
});