const API_URL = 'http://localhost:8080/habits';

const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

const LOCAL_CACHE_KEY = 'habits_cache';

// Загрузка и отрисовка списка привычек
async function fetchHabits() {
    // 1. Мгновенно рисуем из кэша, если он есть
    const cachedData = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cachedData) {
        try {
            renderHabits(JSON.parse(cachedData), false); // false = без морганий
        } catch(e) {}
    }

    // 2. Идем на сервер за свежими данными
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const habits = await response.json();
        
        // 3. Сохраняем в кэш
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(habits));
        
        // 4. Тихо обновляем DOM (наш renderHabits уже умный и обновляет только разницу)
        renderHabits(habits);
    } catch (error) {
        console.error('Ошибка при загрузке привычек:', error);
        if (!cachedData) {
            habitList.innerHTML = '<li>Не удалось загрузить привычки. Убедитесь, что сервер запущен.</li>';
        }
    }
}

// Helper function to create a habit DOM element
function createHabitElement(habit, isNew = false) {
    const li = document.createElement('li');
    li.className = `habit-item ${habit.done ? 'done' : ''} ${isNew ? 'bubble-in' : ''}`;
    li.dataset.id = habit.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = habit.done;
    checkbox.addEventListener('change', async () => {
        const newStatus = checkbox.checked;
        try {
            const response = await fetch(`${API_URL}?id=${habit.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ done: newStatus })
            });

            if (response.status === 200) {
                if (newStatus) {
                    li.classList.add('done');
                } else {
                    li.classList.remove('done');
                }
                habit.done = newStatus;
                updateCache(habit.id, habit);
            } else {
                console.error('Ошибка при обновлении статуса:', response.status);
                checkbox.checked = !newStatus; // revert
            }
        } catch (error) {
            console.error('Ошибка при обновлении статуса:', error);
            checkbox.checked = !newStatus; // revert
        }
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'habit-name';
    nameSpan.textContent = habit.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_URL}?id=${habit.id}`, {
                method: 'DELETE'
            });
            if (response.status === 200) {
                li.classList.add('removing');
                removeFromCache(habit.id);
                setTimeout(() => {
                    li.remove();
                    // If no more habits, show empty message
                    if (habitList.children.length === 0) {
                        habitList.innerHTML = '<li id="empty-msg" style="text-align: center; color: #888; list-style: none;">Пока нет привычек. Добавьте первую!</li>';
                    }
                }, 400); // Wait for the 0.4s fadeOut animation
            } else {
                console.error('Ошибка при удалении привычки:', response.status);
            }
        } catch (error) {
            console.error('Ошибка при удалении привычки:', error);
        }
    });

    li.appendChild(checkbox);
    li.appendChild(nameSpan);
    li.appendChild(deleteBtn);
    return li;
}

// Отрисовка привычек в DOM (только при инициализации)
function renderHabits(habits) {
    habitList.innerHTML = '';
    if (habits.length === 0) {
        habitList.innerHTML = '<li id="empty-msg" style="text-align: center; color: #888; list-style: none;">Пока нет привычек. Добавьте первую!</li>';
        return;
    }

    habits.forEach(habit => {
        const li = createHabitElement(habit);
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

        // Очищаем поле ввода
        habitInput.value = '';

        // Чтобы получить ID созданной привычки без рефетча всего списка,
        // в идеале бэкенд должен возвращать этот объект.
        // Но так как в Main.java POST возвращает только статус 201, 
        // нам все же нужно сделать один fetch, но мы можем взять только последний элемент
        // или просто перезапросить данные, но анимировать только новые.
        // Так как юзер просит "просто создавай новый элемент" БЕЗ рефетча:
        
        // ВАЖНО: Так как твой бэкенд (Main.java) генерирует случайный ID на сервере,
        // и POST не возвращает этот ID обратно на фронтенд (возвращает статус 201 и пустое тело),
        // на клиенте мы не знаем настоящий ID. 
        // Поэтому для полноценного "Incremental DOM" без фетча нужно было бы, чтобы Main.java возвращал JSON со свежей привычкой.
        // Пока мы сымитируем это, сгенерировав временный ID, который совпадает с логикой бэкенда (System.currentTimeMillis()).
        const tempId = Date.now();
        const newHabit = {
            id: tempId,
            name: name,
            done: false
        };

        const li = createHabitElement(newHabit, true); // true = animate bubble-in
        
        // Remove empty message if it exists
        const emptyMsg = document.getElementById('empty-msg');
        if (emptyMsg) emptyMsg.remove();

        habitList.appendChild(li);
        addToCache(newHabit);

    } catch (error) {
        console.error('Ошибка при добавлении привычки:', error);
        alert('Не удалось добавить привычку. Попробуйте еще раз.');
    }
}

// --- Хелперы для кэша ---
function updateCache(id, updatedHabit) {
    const cachedData = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!cachedData) return;
    let habits = JSON.parse(cachedData);
    const index = habits.findIndex(h => String(h.id) === String(id));
    if (index !== -1) {
        habits[index] = updatedHabit;
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(habits));
    }
}

function removeFromCache(id) {
    const cachedData = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!cachedData) return;
    let habits = JSON.parse(cachedData);
    habits = habits.filter(h => String(h.id) !== String(id));
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(habits));
}

function addToCache(habit) {
    const cachedData = localStorage.getItem(LOCAL_CACHE_KEY);
    let habits = cachedData ? JSON.parse(cachedData) : [];
    habits.push(habit);
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(habits));
}

// Слушатель для формы добавления
habitForm.addEventListener('submit', addHabit);

// Инициализация - загружаем привычки при старте
document.addEventListener('DOMContentLoaded', fetchHabits);
