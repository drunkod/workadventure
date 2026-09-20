import type { BaseTranslation } from "../i18n-types";

const say: BaseTranslation = {
    type: {
        say: "Сказать",
        think: "Подумать",
    },
    placeholder: "Введите сообщение...",
    button: "Создать пузырь",
    tooltip: {
        description: {
            say: "Отображает над вашим персонажем облачко чата. Оно видно всем на карте и остаётся на экране 5 секунд.",
            think: "Отображает над вашим персонажем облачко мысли. Оно видно всем игрокам на карте и остаётся на экране, пока вы не двигаетесь.",
        },
    },
};

export default say;
