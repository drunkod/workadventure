import type { BaseTranslation } from "../i18n-types";

const recording: BaseTranslation = {
    refresh: "Обновить",
    title: "Ваш список записей",
    noRecordings: "Записи не найдены",
    errorFetchingRecordings: "Произошла ошибка при получении записей",
    expireIn: "Истекает через {days} дн.{s}",
    download: "Скачать",
    close: "Закрыть",
    recordingList: "Записи",
    contextMenu: {
        openInNewTab: "Открыть в новой вкладке",
        delete: "Удалить",
    },
    notification: {
        deleteNotification: "Запись успешно удалена",
        deleteFailedNotification: "Не удалось удалить запись",
        recordingStarted: "Кто-то из участников обсуждения начал запись.",
        downloadFailedNotification: "Не удалось скачать запись",
        recordingComplete: "Запись завершена",
        recordingIsInProgress: "Идёт запись",
        recordingSaved: "Ваша запись успешно сохранена.",
        howToAccess: "Чтобы получить доступ к записям:",
        viewRecordings: "Просмотреть записи",
    },
    actionbar: {
        title: {
            start: "Начать запись",
            stop: "Остановить запись",
            inProgress: "Идёт запись",
        },
        desc: {
            needLogin: "Для записи необходимо войти в систему.",
            needPremium: "Для записи нужен Premium.",
            advert: "Все участники будут уведомлены о начале записи.",
            yourRecordInProgress: "Идёт запись, нажмите, чтобы остановить её.",
            inProgress: "Идёт запись",
            notEnabled: " Записи отключены в этом мире.",
        },
        spacePicker: {
            megaphone: "Записать мегафон",
            discussion: "Записать обсуждение",
        },
    },
};

export default recording;
