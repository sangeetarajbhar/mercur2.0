"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRequestQueryConfig = exports.adminRequestFields = void 0;
exports.adminRequestFields = [
    "id",
    "name",
    "title",
    "handle",
    "value",
    "description",
    "is_active",
    "is_internal",
    "custom_fields.*",
    "created_at",
    "updated_at",
];
exports.adminRequestQueryConfig = {
    list: {
        defaults: exports.adminRequestFields,
        isList: true,
    },
    retrieve: {
        defaults: exports.adminRequestFields,
        isList: false,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS9hZG1pbi9yZXF1ZXN0cy9xdWVyeS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxrQkFBa0IsR0FBRztJQUNoQyxJQUFJO0lBQ0osTUFBTTtJQUNOLE9BQU87SUFDUCxRQUFRO0lBQ1IsT0FBTztJQUNQLGFBQWE7SUFDYixXQUFXO0lBQ1gsYUFBYTtJQUNiLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1osWUFBWTtDQUNiLENBQUE7QUFFWSxRQUFBLHVCQUF1QixHQUFHO0lBQ3JDLElBQUksRUFBRTtRQUNKLFFBQVEsRUFBRSwwQkFBa0I7UUFDNUIsTUFBTSxFQUFFLElBQUk7S0FDYjtJQUNELFFBQVEsRUFBRTtRQUNSLFFBQVEsRUFBRSwwQkFBa0I7UUFDNUIsTUFBTSxFQUFFLEtBQUs7S0FDZDtDQUNGLENBQUEifQ==