import type { BaseTranslation } from "../i18n-types";

const warning: BaseTranslation = {
    title: "Внимание!",
    content: `Этот мир близок к пределу! Увеличить его вместимость можно <a href="{upgradeLink}" target="_blank">здесь</a>`,
    limit: "Этот мир близок к пределу!",
    accessDenied: {
        camera: "Доступ к камере запрещён. Нажмите здесь и проверьте разрешения браузера.",
        screenSharing: "Демонстрация экрана запрещена. Нажмите здесь и проверьте разрешения браузера.",
        teleport: "У вас нет права телепортироваться к этому пользователю.",
        room: "Доступ к комнате запрещён. Вам нельзя входить в эту комнату.",
    },
    importantMessage: "Важное сообщение",
    connectionLost: "Соединение потеряно. Повторное подключение...",
    connectionLostTitle: "Соединение потеряно",
    connectionLostSubtitle: "Повторное подключение",
    waitingConnectionTitle: "Ожидание соединения",
    waitingConnectionSubtitle: "Подключение",
    megaphoneNeeds: "Чтобы использовать громкоговоритель, включите камеру или микрофон либо поделитесь экраном.",
    mapEditorShortCut: "При попытке открыть редактор карты произошла ошибка.",
    mapEditorNotEnabled: "Редактор карты не включён в этом мире.",
    popupBlocked: {
        title: "Всплывающие окна заблокированы",
        content: "Разрешите всплывающие окна для этого сайта в настройках браузера.",
        done: "ОК",
    },
    backgroundProcessing: {
        failedToApply: "Не удалось применить эффекты фона",
    },
    browserNotSupported: {
        title: "😢 Браузер не поддерживается",
        message: "Ваш браузер ({browserName}) больше не поддерживается WorkAdventure.",
        description: "Ваш браузер слишком стар для запуска WorkAdventure. Обновите его до последней версии, чтобы продолжить.",
        whatToDo: "Что можно сделать?",
        option1: "Обновить {browserName} до последней версии",
        option2: "Покинуть WorkAdventure и использовать другой браузер",
        updateBrowser: "Обновить браузер",
        leave: "Выйти",
    },
};

export default warning;
