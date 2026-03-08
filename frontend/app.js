const API_URL = 'http://localhost:8080/habits';

const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

// Загрузка и отрисовка списка привычек
async function fetchHabits() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const habits = await response.json();
        renderHabits(habits);
    } catch (error) {
        console.error('Ошибка при загрузке привычек:', error);
        habitList.innerHTML = '<li>Не удалось загрузить привычки. Убедитесь, что сервер запущен.</li>';
    }
}

// Отрисовка привычек в DOM
function renderHabits(habits) {
    habitList.innerHTML = ''; // Очищаем текущий список

    if (habits.length === 0) {
        habitList.innerHTML = '<li>Пока нет привычек. Добавьте первую!</li>';
        return;
    }

    habits.forEach(habit => {
        const li = document.createElement('li');
        li.className = `habit-item ${habit.done ? 'done' : ''}`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'habit-name';
        nameSpan.textContent = habit.name;

        // Можно добавить чекбокс или другие элементы управления в будущем
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_URL}?id=${habit.id}`, {
                    method: 'DELETE'
                });
                if (response.status === 200) {
                    li.remove();
                } else {
                    console.error('Ошибка при удалении привычки:', response.status);
                }
            } catch (error) {
                console.error('Ошибка при удалении привычки:', error);
            }
        });

        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        habitList.appendChild(li);
    });
}

// Добавление новой привычки
async function addHabit(event) {
    event.preventDefault();

    const name = habitInput.value.trim();
    if (!name) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Очищаем поле ввода и обновляем список
        habitInput.value = '';
        await fetchHabits();

    } catch (error) {
        console.error('Ошибка при добавлении привычки:', error);
        alert('Не удалось добавить привычку. Попробуйте еще раз.');
    }
}

// Слушатель для формы добавления
habitForm.addEventListener('submit', addHabit);

// Инициализация - загружаем привычки при старте
document.addEventListener('DOMContentLoaded', fetchHabits);
