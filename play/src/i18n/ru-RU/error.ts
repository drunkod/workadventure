import type { BaseTranslation } from "../i18n-types";

const error: BaseTranslation = {
    accessLink: {
        title: "Неверная ссылка доступа",
        subTitle: "Не удалось найти карту. Проверьте ссылку доступа.",
        details: "Для получения дополнительной информации обратитесь к администратору или напишите нам: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Соединение отклонено",
        subTitle: "Вы не можете войти в мир. Попробуйте позже {error}.",
        details: "Для получения дополнительной информации обратитесь к администратору или напишите нам: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Соединение с сервером потеряно. Вы не сможете общаться с другими.",
    },
    errorDialog: {
        title: "Ошибка 😱",
        hasReportIssuesUrl: "Для получения дополнительной информации обратитесь к администратору или сообщите о проблеме здесь:",
        noReportIssuesUrl: "Для получения дополнительной информации обратитесь к администратору мира.",
        messageFAQ: "Также можно ознакомиться с разделом:",
        reload: "Перезагрузить",
        close: "Закрыть",
    },
};

export default error;
