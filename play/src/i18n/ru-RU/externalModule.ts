import type { BaseTranslation } from "../i18n-types";

const externalModule: BaseTranslation = {
    status: {
        onLine: "Статус: всё в порядке ✅",
        offLine: "Статус: не в сети ❌",
        warning: "Статус: предупреждение ⚠️",
        sync: "Статус: синхронизация 🔄",
    },
    teams: {
        openingMeeting: "Открытие встречи Teams...",
        unableJoinMeeting: "Не удалось присоединиться к встрече Teams!",
        userNotConnected: "Ваша учётная запись Outlook или Google не синхронизирована!",
        connectToYourTeams: "Подключите свою учётную запись Outlook или Google 🙏",
        temasAppInfo:
            "Teams — это приложение Microsoft 365, которое помогает вашей команде оставаться на связи и поддерживать порядок. Вы можете общаться в чате, проводить встречи и звонки, а также совместно работать в одном месте 😍",
        buttonSync: "Синхронизировать Teams 🚀",
        buttonConnect: "Подключить Teams 🚀",
    },
    discord: {
        integration: "ИНТЕГРАЦИЯ",
        explainText:
            "Подключив здесь свою учётную запись Discord, вы сможете получать сообщения прямо в чате WorkAdventure. После синхронизации сервера мы создадим содержащиеся в нём комнаты — вам останется только присоединиться к ним в чате WorkAdventure.",
        login: "Подключиться к Discord",
        fetchingServer: "Получение ваших серверов Discord... 👀",
        qrCodeTitle: "Отсканируйте QR-код в приложении Discord, чтобы войти.",
        qrCodeExplainText:
            "Отсканируйте QR-код в приложении Discord, чтобы войти. Срок действия QR-кодов ограничен, поэтому иногда нужно создать новый",
        qrCodeRegenerate: "Получить новый QR-код",
        tokenInputLabel: "Токен Discord",
        loginToken: "Войти с помощью токена",
        loginTokenExplainText: "Введите токен Discord. Инструкции по интеграции Discord см. здесь",
        sendDiscordToken: "отправить",
        tokenNeeded: "Введите токен Discord. Инструкции по интеграции Discord см. здесь",
        howToGetTokenButton: "Как получить токен для входа в Discord",
        loggedIn: "Подключено к:",
        saveSync: "Сохранить и синхронизировать",
        logout: "Выйти",
        back: "Назад",
        tokenPlaceholder: "Ваш токен Discord",
        loginWithQrCode: "Войти по QR-коду",
        guilds: "Серверы Discord",
        guildExplain: "Выберите каналы, которые хотите добавить в интерфейс чата WorkAdventure.\n",
    },
    outlook: {
        signIn: "Войти через Outlook",
        popupScopeToSync: "Подключить учётную запись Outlook",
        popupScopeToSyncExplainText:
            "Нам нужно подключиться к вашей учётной записи Outlook, чтобы синхронизировать календарь и/или задачи. Это позволит просматривать встречи и задачи в WorkAdventure и присоединяться к ним прямо с карты.",
        popupScopeToSyncCalendar: "Синхронизировать мой календарь",
        popupScopeToSyncTask: "Синхронизировать мои задачи",
        popupCancel: "Отмена",
        isSyncronized: "Синхронизировано с Outlook",
        popupScopeIsConnectedExplainText:
            "Вы уже подключены. Нажмите кнопку, чтобы выйти и подключиться снова.",
        popupScopeIsConnectedButton: "Выйти",
        popupErrorTitle: "⚠️ Не удалось синхронизировать модуль Outlook или Teams",
        popupErrorDescription:
            "Не удалось синхронизировать модуль Outlook или Teams при инициализации. Чтобы подключиться, попробуйте подключиться снова.",
        popupErrorContactAdmin: "Если проблема не исчезнет, обратитесь к администратору.",
        popupErrorShowMore: "Показать дополнительную информацию",
        popupErrorMoreInfo1:
            "Возможно, возникла проблема с процессом входа. Проверьте правильность настройки провайдера SSO Azure.",
        popupErrorMoreInfo2:
            'Проверьте, что область "offline_access" включена для провайдера SSO Azure. Эта область необходима для получения токена обновления и поддержания подключения модуля Teams или Outlook.',
    },
    google: {
        signIn: "Войти через Google",
        popupScopeToSync: "Подключить учётную запись Google",
        popupScopeToSyncExplainText:
            "Нам нужно подключиться к вашей учётной записи Google, чтобы синхронизировать календарь и/или задачи. Это позволит просматривать встречи и задачи в WorkAdventure и присоединяться к ним прямо с карты.",
        popupScopeToSyncCalendar: "Синхронизировать мой календарь",
        popupScopeToSyncTask: "Синхронизировать мои задачи",
        popupCancel: "Отмена",
        isSyncronized: "Синхронизировано с Google",
        popupScopeToSyncMeet: "Создать онлайн-встречи",
        openingMeet: "Открытие Google Meet... 🙏",
        unableJoinMeet: "Не удалось присоединиться к Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Создание вашего пространства Google… это займёт всего несколько секунд 💪",
            guestError: "Вы не подключены, поэтому не можете создать Google Meet 😭",
            guestExplain:
                "Войдите на платформу, чтобы создать Google Meet, или попросите владельца создать встречу для вас 🚀",
            error: "Настройки Google Workspace не позволяют создать Meet.",
            errorExplain: "Не беспокойтесь: вы всё равно можете присоединиться к встречам по ссылке, которой поделится кто-то другой 🙏",
        },
        popupScopeIsConnectedButton: "Выйти",
        popupScopeIsConnectedExplainText:
            "Вы уже подключены. Нажмите кнопку, чтобы выйти и подключиться снова.",
    },
    calendar: {
        title: "Ваша встреча сегодня",
        joinMeeting: "Нажмите здесь, чтобы присоединиться к встрече",
    },
    todoList: {
        title: "Задачи",
        sentence: "Сделайте перерыв 🙏 может, выпьете кофе или чаю? ☕",
    },
};

export default externalModule;
