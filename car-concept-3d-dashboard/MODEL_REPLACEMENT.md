# Как заменить автомобиль в Auto Anatomy

Вам не нужно менять `main.js`, Raycaster, камеру, Scroll Story или 3D Lab. Для новой машины создаётся только новый model config и, при необходимости, текстовые описания компонентов.

## 1. Положите новый GLB в проект

Например:

```text
Auto Anatomy/
  new_car.glb
```

Не удаляйте старый GLB, пока новая модель полностью не проверена.

## 2. Создайте config новой модели

Скопируйте:

```text
src/models/currentCar.js
```

в новый файл, например:

```text
src/models/futureCar.js
```

Поменяйте основные поля:

```js
export const futureCarModelConfig = {
  id: 'future_car',
  displayName: 'Future Car',
  modelPath: './new_car.glb',
  estimatedFileSize: 20000000,
  // ...
};
```

`estimatedFileSize` используется только как запасное значение для progress bar, если сервер не сообщил размер файла.

## 3. Выберите новый config

Откройте:

```text
src/models/index.js
```

Импортируйте новый config и назначьте его как активный:

```js
import { futureCarModelConfig } from './futureCar.js';

export const ACTIVE_MODEL_CONFIG = futureCarModelConfig;
```

Чтобы вернуться к текущей машине, снова выберите `currentCarModelConfig`.

## 4. Включите инспектор модели

В `src/models/index.js` временно установите:

```js
export const DEBUG_MODEL = true;
```

Перезагрузите страницу и откройте browser Console. Найдите группу:

```text
[Auto Anatomy] MODEL INSPECTOR
```

Там будут:

- полная GLB hierarchy;
- имена `Object3D`, `Group` и `Mesh`;
- parent и полный path каждого объекта;
- Bounding Box Mesh;
- назначенный `componentId`;
- таблица `UNASSIGNED MESHES`.

В сцене также появятся bounding boxes и подписи логических компонентов. После настройки обязательно верните `DEBUG_MODEL = false`.

## 5. Настройте normalization

Новая модель может иметь другой scale, rotation и origin. В config используйте:

```js
normalization: {
  targetSize: 3.5,
  center: [0, 0.2, 0],
  rotation: [0, 0, 0]
}
```

- `targetSize` — максимальный размер нормализованной машины;
- `center` — точка, вокруг которой автомобиль размещается в основной сцене;
- `rotation` — коррекция ориентации GLB в радианах.

Сначала попробуйте значения выше. Меняйте `rotation`, только если новая машина смотрит не в ту сторону или лежит на боку.

## 6. Создайте Logical Components

В `components` ключ является стабильным `componentId`. Имена внутри `nodes` — реальные имена из нового GLB.

```js
components: {
  engine: {
    displayName: 'Engine',
    nodes: [
      'Engine_Block',
      'Engine_Cover',
      'Engine_Intake',
      'Engine_Pipes'
    ]
  },
  hood: {
    displayName: 'Hood',
    nodes: ['Hood_Group']
  }
}
```

Один `componentId` может содержать любое количество Mesh. Adapter создаст общий `THREE.Group`, если перечисленные узлы ещё не объединены в GLB.

Если в `nodes` указан родительский Group, его дочерние Mesh будут включены автоматически. Не перечисляйте одновременно Group и все его дочерние Mesh без необходимости.

## 7. Проверьте validation warnings

При загрузке Console показывает результат для каждого компонента:

```text
[Auto Anatomy] Component "engine": 3 configured nodes found, 1 configured node missing.
```

Если найден хотя бы один настроенный узел с Mesh, приложение продолжит работать. Если не найдено ничего, компонент будет пропущен и не появится в Lab/UI.

Проверьте таблицу `UNASSIGNED MESHES`. Эти Mesh не удаляются; список только показывает детали, которые ещё не сопоставлены с компонентом.

## 8. Настройте Exploded View

Explode-настройки находятся рядом с компонентом в model config:

```js
engine: {
  nodes: ['Engine_Group'],
  explode: {
    direction: [0, 1, 0.3],
    distanceFactor: 0.13
  }
}
```

`direction` задаёт направление, а `distanceFactor` — расстояние относительно размера всей нормализованной машины.

Для левых и правых деталей можно использовать автоматическое направление от центра:

```js
explode: {
  directionMode: 'radial-x',
  verticalBias: 0.05,
  distanceFactor: 0.18
}
```

Не добавляйте explode-координаты в `main.js`.

## 9. Добавьте компонент в Lab

Укажите у компонента Lab slot:

```js
engine: {
  nodes: ['Engine_Group'],
  lab: {
    slotId: 'front_center',
    rotation: [0, 0, 0],
    maxSize: 1.8
  }
}
```

Доступные exhibition slots находятся в:

```text
src/labSlots.js
```

Slot хранит позицию подиума и направление камеры. Координаты исходной машины для Lab не используются. Для дополнительных компонентов добавьте новые slots и назначьте им уникальные `slotId`.

Если у компонента нет `lab`, он может участвовать в Explode, но не появится в Lab.

## 10. Добавьте текст Information Panel

Откройте:

```text
src/partsData.js
```

Добавьте данные под тем же `componentId`:

```js
engine: {
  componentId: 'engine',
  title: 'Engine',
  category: 'Powertrain',
  description: '...',
  function: '...'
}
```

Если component присутствует в config, но для него нет `PARTS_DATA`, он не будет показан в Lab. Техническое имя Mesh здесь не используется.

## 11. Проверьте Raycaster и Camera Focus

1. Откройте Lab.
2. Наведите курсор на каждый экспонат — должна появиться правильная подпись.
3. Нажмите на геометрию, а не только на пункт списка.
4. Убедитесь, что открылся правильный `componentId`.
5. Проверьте маленький и большой компонент.

Camera Focus сам рассчитывает Bounding Sphere, FOV и дистанцию. Отдельную фиксированную camera distance для каждой детали задавать не нужно.

## 12. Проверьте полный Explode и отсутствие потерь

1. На первом экране автомобиль должен быть полностью собран.
2. Прокрутите до `EXPLODE 100%`.
3. Убедитесь, что компоненты переместились целиком.
4. Прокрутите обратно до `000%`.
5. Машина должна точно собраться без смещения, rotation или scale drift.
6. В Console откройте `[Auto Anatomy] Model audit`.
7. Проверьте:

```text
totalMeshCount === currentMeshCount
lostMeshes.length === 0
hiddenMeshes.length === 0
```

`UNASSIGNED MESHES` допустимы во время настройки: они остаются в общей машине и не удаляются. Перед завершением проверьте, не забыта ли среди них важная самостоятельная деталь.

## Коротко

Для новой машины нужно:

1. добавить `.glb`;
2. скопировать model config;
3. включить `DEBUG_MODEL`;
4. сопоставить GLB Nodes со стабильными `componentId`;
5. настроить normalization и explode;
6. назначить нужные компоненты на Lab slots;
7. добавить тексты в `partsData.js`;
8. проверить Console, Raycaster, Camera Focus и обратную сборку;
9. выключить `DEBUG_MODEL`.
