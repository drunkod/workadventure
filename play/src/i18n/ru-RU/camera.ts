import type { BaseTranslation } from "../i18n-types";

const camera: BaseTranslation = {
    editCam: "Изменить камеру",
    editMic: "Изменить микрофон",
    editSpeaker: "Изменить аудиовыход",
    active: "Активно",
    disabled: "Отключено",
    notRecommended: "Не рекомендуется",
    enable: {
        title: "Включите камеру и микрофон",
        start: "Добро пожаловать на страницу настройки аудио- и видеоустройств! Здесь вы найдёте инструменты для улучшения работы онлайн. Настройте параметры в соответствии со своими предпочтениями и устраните возможные проблемы. Убедитесь, что оборудование правильно подключено и обновлено. Изучите и протестируйте разные конфигурации, чтобы найти оптимальный вариант.",
    },
    help: {
        title: "Требуется доступ к камере и микрофону",
        permissionDenied: "Доступ запрещён",
        content: "Разрешите доступ к камере и микрофону в браузере.",
        firefoxContent:
            'Нажмите флажок «Запомнить это решение», если не хотите, чтобы Firefox снова запрашивал разрешение.',
        allow: "Разрешить веб-камеру",
        continue: "Продолжить без веб-камеры",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "Ошибка соединения с сервером видеотрансляции",
        titlePending: "Ожидание соединения с сервером видеотрансляции",
        error: "Сервер TURN недоступен",
        content: "Не удаётся подключиться к серверу видеотрансляции. Возможно, вы не сможете общаться с другими пользователями.",
        solutionVpn:
            "Если вы <strong>подключаетесь через VPN</strong>, отключитесь от VPN и обновите веб-страницу.",
        solutionVpnNotAskAgain: "Понятно. Больше не предупреждать 🫡",
        solutionHotspot:
            "Если вы находитесь в сети с ограничениями (например, корпоративной), попробуйте сменить сеть. Например, создайте на телефоне <strong>точку доступа Wi‑Fi</strong> и подключитесь через неё.",
        solutionNetworkAdmin: "Если вы <strong>сетевой администратор</strong>, ознакомьтесь с руководством ",
        preparingYouNetworkGuide: '«Подготовка вашей сети»',
        refresh: "Обновить",
        continue: "Продолжить",
        newDeviceDetected: "Обнаружено новое устройство {device} 🎉 Переключиться? [SPACE]",
    },
    my: {
        silentZone: "Тихая зона",
        silentZoneDesc:
            "Вы находитесь в тихой зоне. Вы видите и слышите только тех, кто находится рядом с вами. Вы не видите и не слышите остальных людей в комнате.",
        nameTag: "Вы",
        loading: "Загрузка камеры...",
    },
    disable: "Выключить камеру",
    menu: {
        moreAction: "Другие действия",
        closeMenu: "Закрыть меню",
        senPrivateMessage: "Отправить личное сообщение (скоро)",
        kickoffUser: "Выгнать пользователя",
        muteAudioUser: "Отключить звук",
        askToMuteAudioUser: "Попросить отключить звук",
        muteAudioEveryBody: "Отключить звук для всех",
        muteVideoUser: "Отключить видео",
        askToMuteVideoUser: "Попросить отключить видео",
        muteVideoEveryBody: "Отключить видео для всех",
        blockOrReportUser: "Модерация",
    },
    backgroundEffects: {
        imageTitle: "Фоновые изображения",
        videoTitle: "Фоновые видео",
        blurTitle: "Размытие фона",
        resetTitle: "Отключить эффекты фона",
        title: "Эффекты фона",
        close: "Закрыть",
        blurAmount: "Степень размытия",
    },
};

export default camera;
