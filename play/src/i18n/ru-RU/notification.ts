import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "{name} хочет с вами поговорить",
    message: "{name} отправляет сообщение",
    chatRoom: "в чате",
    askToMuteMicrophone: "Можно выключить ваш микрофон?",
    askToMuteCamera: "Можно выключить вашу камеру?",
    microphoneMuted: "Модератор выключил ваш микрофон",
    cameraMuted: "Модератор выключил вашу камеру",
    notificationSentToMuteMicrophone: "{name} отправлено уведомление с просьбой выключить микрофон",
    notificationSentToMuteCamera: "{name} отправлено уведомление с просьбой выключить камеру",
    announcement: "Объявление",
    open: "Открыть",
    help: {
        title: "Доступ к уведомлениям запрещён",
        permissionDenied: "Доступ запрещён",
        content:
            "Не пропускайте обсуждения. Включите уведомления, чтобы узнавать, когда кто-то хочет с вами поговорить, даже если вкладка WorkAdventure не открыта.",
        firefoxContent:
            'Установите флажок «Запомнить это решение», если не хотите, чтобы Firefox снова запрашивал разрешение.',
        refresh: "Обновить",
        continue: "Продолжить без уведомлений",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "добавить новый тег: '{tag}'",
    screenSharingError: "Не удалось начать демонстрацию экрана",
    recordingStarted: "Кто-то из участников обсуждения начал запись.",
    urlCopiedToClipboard: "URL скопирован в буфер обмена",
};

export default notification;
