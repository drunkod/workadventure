import type { BaseTranslation } from "../i18n-types";

const login: BaseTranslation = {
    input: {
        name: {
            placeholder: "Введите имя",
            empty: "Имя не указано",
            tooLongError: "Имя слишком длинное",
            notValidError: "Неверный формат имени",
        },
    },
    genericError: "Произошла ошибка",
    terms: "Продолжая, вы принимаете наши {links}.",
    termsOfUse: "условия использования",
    privacyPolicy: "политику конфиденциальности",
    cookiePolicy: "политику использования файлов cookie",
    continue: "Продолжить",
};

export default login;
