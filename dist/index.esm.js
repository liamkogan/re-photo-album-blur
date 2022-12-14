import { jsx, Fragment } from 'react/jsx-runtime';
import { useLayoutEffect as useLayoutEffect$1, useEffect, useRef, useCallback, useState } from 'react';

const ratio = ({ width, height }) => width / height;

const round = (value, decimals = 0) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

const RankingFunctionComparator = (rank) => (a, b) => rank(b) - rank(a);
const MinHeap = (comparator) => {
    const heap = [];
    const compare = comparator;
    let n = 0;
    const greater = (i, j) => compare(heap[i], heap[j]) < 0;
    const swap = (i, j) => {
        const temp = heap[i];
        heap[i] = heap[j];
        heap[j] = temp;
    };
    const swim = (k) => {
        let k2 = k >> 1;
        while (k > 1 && greater(k2, k)) {
            swap(k2, k);
            k = k2;
            k2 = k >> 1;
        }
    };
    const sink = (k) => {
        let j = k << 1;
        while (j <= n) {
            if (j < n && greater(j, j + 1))
                j++;
            if (!greater(k, j))
                break;
            swap(k, j);
            k = j;
            j = k << 1;
        }
    };
    return {
        push: (element) => {
            n += 1;
            heap[n] = element;
            swim(n);
        },
        pop: () => {
            if (n === 0)
                return undefined;
            swap(1, n);
            n -= 1;
            const max = heap.pop();
            sink(1);
            return max;
        },
        size: () => n,
    };
};

const buildPrecedentsMap = (graph, startNode, endNode) => {
    const precedentsMap = {};
    const visited = {};
    const storedShortestPaths = {};
    storedShortestPaths[startNode] = 0;
    const pQueue = MinHeap(RankingFunctionComparator((el) => el.weight));
    pQueue.push({ id: startNode, weight: 0 });
    let shortestNode;
    while ((shortestNode = pQueue.pop()) !== undefined) {
        const shortestNodeId = shortestNode.id;
        if (visited[shortestNodeId])
            continue;
        const neighboringNodes = graph(shortestNodeId);
        visited[shortestNodeId] = 1;
        for (const neighbor in neighboringNodes) {
            const newTotalWeight = shortestNode.weight + neighboringNodes[neighbor];
            if (storedShortestPaths[neighbor] === undefined ||
                (storedShortestPaths[neighbor] > newTotalWeight &&
                    (storedShortestPaths[neighbor] / newTotalWeight > 1.005 ||
                        precedentsMap[neighbor] < shortestNodeId))) {
                storedShortestPaths[neighbor] = newTotalWeight;
                pQueue.push({ id: neighbor, weight: newTotalWeight });
                precedentsMap[neighbor] = shortestNodeId;
            }
        }
    }
    if (typeof storedShortestPaths[endNode] === "undefined") {
        return undefined;
    }
    return precedentsMap;
};
const getPathFromPrecedentsMap = (precedentsMap, endNode) => {
    const nodes = [];
    let n = endNode;
    while (n) {
        nodes.push(n);
        n = precedentsMap[n];
    }
    return nodes.reverse();
};
const findShortestPath = (graph, startNode, endNode) => {
    const precedentsMap = buildPrecedentsMap(graph, startNode, endNode);
    return precedentsMap !== undefined ? getPathFromPrecedentsMap(precedentsMap, endNode) : undefined;
};

const findIdealNodeSearch = ({ photos, targetRowHeight, containerWidth, }) => {
    const minRatio = photos.reduce((acc, photo) => Math.min(ratio(photo), acc), Number.MAX_VALUE);
    return round(containerWidth / targetRowHeight / minRatio) + 2;
};
const getCommonHeight = (row, containerWidth, spacing, padding) => {
    const rowWidth = containerWidth - (row.length - 1) * spacing - 2 * padding * row.length;
    const totalAspectRatio = row.reduce((acc, photo) => acc + ratio(photo), 0);
    return rowWidth / totalAspectRatio;
};
const cost = (photos, i, j, width, targetRowHeight, spacing, padding) => {
    const row = photos.slice(i, j);
    const commonHeight = getCommonHeight(row, width, spacing, padding);
    return commonHeight > 0 ? (commonHeight - targetRowHeight) ** 2 * row.length : undefined;
};
const makeGetNeighbors$1 = ({ photos, layoutOptions, targetRowHeight, limitNodeSearch, rowConstraints, instrumentation, }) => (node) => {
    var _a, _b;
    const { containerWidth, spacing, padding } = layoutOptions;
    const results = {};
    const start = +node;
    results[+start] = 0;
    const startOffset = (_a = rowConstraints === null || rowConstraints === void 0 ? void 0 : rowConstraints.minPhotos) !== null && _a !== void 0 ? _a : 1;
    const endOffset = Math.min(limitNodeSearch, (_b = rowConstraints === null || rowConstraints === void 0 ? void 0 : rowConstraints.maxPhotos) !== null && _b !== void 0 ? _b : Infinity);
    for (let i = start + startOffset; i < photos.length + 1; i += 1) {
        if (i - start > endOffset && !(instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.fullGraphSearch))
            break;
        const currentCost = cost(photos, start, i, containerWidth, targetRowHeight, spacing, padding);
        if (currentCost === undefined)
            break;
        results[i.toString()] = currentCost;
    }
    return results;
};
const computeRowsLayout = ({ photos, layoutOptions, instrumentation, }) => {
    var _a, _b;
    const { spacing, padding, containerWidth, targetRowHeight, rowConstraints } = layoutOptions;
    (_a = instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.onStartLayoutComputation) === null || _a === void 0 ? void 0 : _a.call(instrumentation);
    const limitNodeSearch = findIdealNodeSearch({ photos, containerWidth, targetRowHeight });
    const getNeighbors = makeGetNeighbors$1({
        photos,
        layoutOptions,
        targetRowHeight,
        limitNodeSearch,
        rowConstraints,
        instrumentation,
    });
    const path = findShortestPath(getNeighbors, "0", `${photos.length}`);
    if (path === undefined)
        return undefined;
    const result = [];
    for (let i = 1; i < path.length; i += 1) {
        const row = photos.map((photo, index) => ({ photo, index })).slice(+path[i - 1], +path[i]);
        const height = getCommonHeight(row.map(({ photo }) => photo), containerWidth, spacing, padding);
        result.push(row.map(({ photo, index }, photoIndex) => ({
            photo,
            layout: {
                height,
                width: height * ratio(photo),
                index,
                photoIndex,
                photosCount: row.length,
            },
        })));
    }
    (_b = instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.onFinishLayoutComputation) === null || _b === void 0 ? void 0 : _b.call(instrumentation, result);
    return result;
};

const calcWidth = (base, { width, photosCount }, { spacing, padding, containerWidth }) => {
    const gaps = spacing * (photosCount - 1) + 2 * padding * photosCount;
    return `calc((${base} - ${gaps}px) / ${round((containerWidth - gaps) / width, 5)})`;
};
const cssWidth$1 = (layout, layoutOptions) => {
    if (layoutOptions.layout !== "rows") {
        return `calc(100% - ${2 * layoutOptions.padding}px)`;
    }
    return calcWidth("100%", layout, layoutOptions);
};
const calculateSizesValue = (size, layout, layoutOptions) => { var _a, _b; return calcWidth((_b = (_a = size.match(/calc\((.*)\)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : size, layout, layoutOptions); };
const srcSetAndSizes = (photo, layout, layoutOptions) => {
    let srcSet, sizes;
    if (photo.images && photo.images.length > 0) {
        srcSet = photo.images
            .concat([
            {
                src: photo.src,
                width: photo.width,
                height: photo.height,
            },
        ])
            .sort((first, second) => first.width - second.width)
            .map((image) => `${image.src} ${image.width}w`)
            .join(", ");
    }
    if (layoutOptions.sizes) {
        sizes = (layoutOptions.sizes.sizes || [])
            .map(({ viewport, size }) => `${viewport} ${calculateSizesValue(size, layout, layoutOptions)}`)
            .concat(calculateSizesValue(layoutOptions.sizes.size, layout, layoutOptions))
            .join(", ");
    }
    else {
        sizes = `${Math.ceil((layout.width / (layoutOptions.viewportWidth || layoutOptions.containerWidth)) * 100)}vw`;
    }
    return { srcSet, sizes };
};
const PhotoRenderer = (props) => {
    var _a, _b;
    const { photo, layout, layoutOptions, imageProps: { style, ...restImageProps } = {}, renderPhoto } = props;
    const { onClick } = layoutOptions;
    const imageStyle = {
        display: "block",
        boxSizing: "content-box",
        width: cssWidth$1(layout, layoutOptions),
        height: "auto",
        aspectRatio: `${photo.width} / ${photo.height}`,
        ...(layoutOptions.padding ? { padding: `${layoutOptions.padding}px` } : null),
        ...((layoutOptions.layout === "columns" || layoutOptions.layout === "masonry") &&
            layout.photoIndex < layout.photosCount - 1
            ? { marginBottom: `${layoutOptions.spacing}px` }
            : null),
        ...(onClick ? { cursor: "pointer" } : null),
        ...style,
    };
    const handleClick = onClick
        ? (event) => {
            onClick(event, photo, layout.index);
        }
        : undefined;
    const imageProps = {
        src: photo.src,
        alt: (_a = photo.alt) !== null && _a !== void 0 ? _a : "",
        title: photo.title,
        onClick: handleClick,
        style: imageStyle,
        className: `react-photo-album--photo ${photo.className}`,
        blurDataUrl: photo.blurDataUrl,
                // ...srcSetAndSizes(photo, layout, layoutOptions),
                sizes: photo.sizes,
        ...restImageProps,
    };
    const renderDefaultPhoto = ({ wrapped } = {}) => {
        const { src, alt, srcSet, sizes, style, blurDataUrl, ...rest } = imageProps;
        return (jsx("img", { alt: alt, ...(srcSet ? { srcSet, sizes } : null), blurDataUrl: blurDataUrl, src: src, style: wrapped ? { display: "block", width: "100%", height: "100%" } : style, ...rest }));
    };
    const wrapperStyle = (({ display, boxSizing, width, aspectRatio, padding, marginBottom }) => ({
        display,
        boxSizing,
        width,
        aspectRatio,
        padding,
        marginBottom,
    }))(imageStyle);
    return (jsx(Fragment, { children: (_b = renderPhoto === null || renderPhoto === void 0 ? void 0 : renderPhoto({
            photo,
            layout,
            layoutOptions,
            imageProps,
            renderDefaultPhoto,
            wrapperStyle,
        })) !== null && _b !== void 0 ? _b : renderDefaultPhoto() }));
};

const defaultRenderRowContainer = ({ rowContainerProps, children, }) => jsx("div", { ...rowContainerProps, children: children });
const RowContainerRenderer = (props) => {
    const { layoutOptions, rowIndex, rowsCount, renderRowContainer, rowContainerProps: { style, ...restRowContainerProps } = {}, children, } = props;
    const rowContainerProps = {
        className: "react-photo-album--row",
        style: {
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            ...(rowIndex < rowsCount - 1 ? { marginBottom: `${layoutOptions.spacing}px` } : null),
            ...style,
        },
        ...restRowContainerProps,
    };
    return (jsx(Fragment, { children: (renderRowContainer !== null && renderRowContainer !== void 0 ? renderRowContainer : defaultRenderRowContainer)({
            layoutOptions,
            rowIndex,
            rowsCount,
            rowContainerProps,
            children,
        }) }));
};

const RowsLayout = (props) => {
    const { photos, layoutOptions, renderPhoto, renderRowContainer, componentsProps, instrumentation } = props;
    const rowsLayout = computeRowsLayout({ photos, layoutOptions, instrumentation });
    if (rowsLayout === undefined)
        return jsx(Fragment, {});
    return (jsx(Fragment, { children: rowsLayout.map((row, rowIndex) => (jsx(RowContainerRenderer, { layoutOptions: layoutOptions, rowIndex: rowIndex, rowsCount: rowsLayout.length, renderRowContainer: renderRowContainer, rowContainerProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.rowContainerProps, children: row.map(({ photo, layout }) => (jsx(PhotoRenderer, { photo: photo, layout: layout, layoutOptions: layoutOptions, renderPhoto: renderPhoto, imageProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.imageProps }, photo.key || photo.src))) }, `row-${rowIndex}`))) }));
};

const computeShortestPath = (graph, pathLength, startNode, endNode) => {
    const comp = [];
    const queue = { 0: { [startNode]: null } };
    for (let length = 0; length < pathLength; length += 1) {
        Object.keys(queue[length]).forEach((n) => {
            const node = +n;
            const accumulatedWeight = length > 0 && comp[node][length] ? comp[node][length][1] : 0;
            graph(node).forEach(({ neighbor, weight }) => {
                if (!comp[neighbor]) {
                    comp[neighbor] = [];
                }
                const newTotalWeight = accumulatedWeight + weight;
                if (!comp[neighbor][length + 1] ||
                    (comp[neighbor][length + 1][1] > newTotalWeight &&
                        (comp[neighbor][length + 1][1] / newTotalWeight > 1.0001 ||
                            node < comp[neighbor][length + 1][0]))) {
                    comp[neighbor][length + 1] = [node, newTotalWeight];
                }
                if (length < pathLength - 1 && neighbor !== endNode) {
                    if (!queue[length + 1]) {
                        queue[length + 1] = {};
                    }
                    queue[length + 1][neighbor] = null;
                }
            });
        });
    }
    return comp;
};
const reconstructShortestPath = (comp, pathLength, endNode) => {
    const path = [endNode];
    for (let node = endNode, length = pathLength; length > 0; length -= 1) {
        const [prevNode] = comp[node][length];
        node = prevNode;
        path.push(node);
    }
    return path.reverse();
};
const findShortestPathLengthN = (graph, pathLength, startNode, endNode) => reconstructShortestPath(computeShortestPath(graph, pathLength, startNode, endNode), pathLength, endNode);

const makeGetNeighbors = ({ photos, spacing, padding, targetColumnWidth, targetColumnHeight, instrumentation, }) => (node) => {
    const results = [];
    const cutOffHeight = targetColumnHeight * 1.5;
    let height = targetColumnWidth / ratio(photos[node]) + 2 * padding;
    for (let i = node + 1; i < photos.length + 1; i += 1) {
        results.push({ neighbor: i, weight: (targetColumnHeight - height) ** 2 });
        if ((height > cutOffHeight && !(instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.fullGraphSearch)) || i === photos.length) {
            break;
        }
        height += targetColumnWidth / ratio(photos[i]) + spacing + 2 * padding;
    }
    return results;
};
const buildColumnsModel = ({ path, photos, containerWidth, columnsGaps, columnsRatios, spacing, padding, }) => {
    const columnsModel = [];
    const totalRatio = columnsRatios.reduce((acc, ratio) => acc + ratio, 0);
    for (let i = 0; i < path.length - 1; i += 1) {
        const column = photos.map((photo, index) => ({ photo, index })).slice(path[i], path[i + 1]);
        const totalAdjustedGaps = columnsRatios.reduce((acc, ratio, index) => acc + (columnsGaps[i] - columnsGaps[index]) * ratio, 0);
        const columnWidth = ((containerWidth - (path.length - 2) * spacing - 2 * (path.length - 1) * padding - totalAdjustedGaps) *
            columnsRatios[i]) /
            totalRatio;
        columnsModel.push(column.map(({ photo, index }, photoIndex) => ({
            photo,
            layout: {
                width: columnWidth,
                height: columnWidth / ratio(photo),
                index,
                photoIndex,
                photosCount: column.length,
            },
        })));
    }
    return columnsModel;
};
const computeColumnsModel = ({ photos, layoutOptions, targetColumnWidth, instrumentation, }) => {
    var _a;
    const { columns, spacing, padding, containerWidth } = layoutOptions;
    const columnsGaps = [];
    const columnsRatios = [];
    if (photos.length <= columns) {
        for (let index = 0; index < photos.length; index += 1) {
            columnsGaps[index] = 2 * padding;
            columnsRatios[index] = ratio(photos[index]);
        }
        const columnsModel = buildColumnsModel({
            path: Array.from({ length: photos.length + 1 }).map((_, index) => index),
            photos,
            columnsRatios,
            columnsGaps,
            containerWidth,
            spacing,
            padding,
        });
        for (let i = photos.length; i < (((_a = layoutOptions.columnConstraints) === null || _a === void 0 ? void 0 : _a.minColumns) || 0); i += 1) {
            columnsGaps[i] = 0;
            columnsRatios[i] =
                photos.length > 0 ? photos.reduce((acc, photo) => acc + ratio(photo), 0) / photos.length : 1;
            columnsModel[i] = [];
        }
        return { columnsGaps, columnsRatios, columnsModel };
    }
    const targetColumnHeight = (photos.reduce((acc, photo) => acc + targetColumnWidth / ratio(photo), 0) +
        spacing * (photos.length - columns) +
        2 * padding * photos.length) /
        columns;
    const getNeighbors = makeGetNeighbors({
        photos,
        targetColumnWidth,
        targetColumnHeight,
        spacing,
        padding,
        instrumentation,
    });
    const path = findShortestPathLengthN(getNeighbors, columns, 0, photos.length).map((node) => +node);
    for (let i = 0; i < path.length - 1; i += 1) {
        const column = photos.slice(path[i], path[i + 1]);
        columnsGaps[i] = spacing * (column.length - 1) + 2 * padding * column.length;
        columnsRatios[i] = 1 / column.reduce((acc, photo) => acc + 1 / ratio(photo), 0);
    }
    const columnsModel = buildColumnsModel({
        path,
        photos,
        columnsRatios,
        columnsGaps,
        containerWidth,
        spacing,
        padding,
    });
    return { columnsGaps, columnsRatios, columnsModel };
};
const computeLayout = (props) => {
    const { photos, layoutOptions, instrumentation } = props;
    const { columns, spacing, padding, containerWidth } = layoutOptions;
    const targetColumnWidth = (containerWidth - spacing * (columns - 1) - 2 * padding * columns) / columns;
    const { columnsGaps, columnsRatios, columnsModel } = computeColumnsModel({
        photos,
        layoutOptions,
        targetColumnWidth,
        instrumentation,
    });
    if (columnsModel.findIndex((columnModel) => columnModel.findIndex(({ layout: { width, height } }) => width < 0 || height < 0) >= 0) >= 0) {
        if (columns > 1) {
            return computeLayout({
                photos,
                layoutOptions: {
                    ...layoutOptions,
                    columns: columns - 1,
                },
                instrumentation,
            });
        }
        else {
            return undefined;
        }
    }
    return { columnsModel, columnsGaps, columnsRatios };
};
const computeColumnsLayout = ({ photos, layoutOptions, instrumentation, }) => {
    var _a, _b, _c;
    (_a = instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.onStartLayoutComputation) === null || _a === void 0 ? void 0 : _a.call(instrumentation);
    const result = computeLayout({
        photos,
        layoutOptions: {
            ...layoutOptions,
            columns: Math.min(layoutOptions.columns, Math.max(photos.length, ((_b = layoutOptions.columnConstraints) === null || _b === void 0 ? void 0 : _b.minColumns) || 0)),
        },
        instrumentation,
    });
    (_c = instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.onFinishLayoutComputation) === null || _c === void 0 ? void 0 : _c.call(instrumentation, result);
    return result;
};

const defaultRenderColumnContainer = ({ columnContainerProps, children, }) => jsx("div", { ...columnContainerProps, children: children });
const cssWidth = (props) => {
    const { layoutOptions, columnIndex, columnsCount, columnsGaps, columnsRatios } = props;
    const { layout, spacing, padding } = layoutOptions;
    if (layout === "masonry" || !columnsGaps || !columnsRatios) {
        return `calc((100% - ${spacing * (columnsCount - 1)}px) / ${columnsCount})`;
    }
    const totalRatio = columnsRatios.reduce((acc, ratio) => acc + ratio, 0);
    const totalAdjustedGaps = columnsRatios.reduce((acc, ratio, index) => acc + (columnsGaps[columnIndex] - columnsGaps[index]) * ratio, 0);
    return `calc((100% - ${round((columnsCount - 1) * spacing + 2 * columnsCount * padding + totalAdjustedGaps, 3)}px) * ${round(columnsRatios[columnIndex] / totalRatio, 5)} + ${2 * padding}px)`;
};
const ColumnContainerRenderer = (props) => {
    const { layoutOptions, renderColumnContainer, children, columnContainerProps: { style, ...restColumnContainerProps } = {}, ...rest } = props;
    const columnContainerProps = {
        className: "react-photo-album--column",
        style: {
            display: "flex",
            flexDirection: "column",
            flexWrap: "nowrap",
            alignItems: "flex-start",
            width: cssWidth(props),
            justifyContent: layoutOptions.layout === "columns" ? "space-between" : "flex-start",
            ...style,
        },
        ...restColumnContainerProps,
    };
    return (jsx(Fragment, { children: (renderColumnContainer !== null && renderColumnContainer !== void 0 ? renderColumnContainer : defaultRenderColumnContainer)({
            layoutOptions,
            columnContainerProps,
            children,
            ...rest,
        }) }));
};

const ColumnsLayout = (props) => {
    const { photos, layoutOptions, renderPhoto, renderColumnContainer, componentsProps, instrumentation } = props;
    const columnsLayout = computeColumnsLayout({ photos, layoutOptions, instrumentation });
    if (columnsLayout === undefined)
        return jsx(Fragment, {});
    const { columnsModel, columnsRatios, columnsGaps } = columnsLayout;
    return (jsx(Fragment, { children: columnsModel.map((column, columnIndex) => (jsx(ColumnContainerRenderer, { layoutOptions: layoutOptions, columnIndex: columnIndex, columnsCount: columnsModel.length, columnsGaps: columnsGaps, columnsRatios: columnsRatios, renderColumnContainer: renderColumnContainer, columnContainerProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.columnContainerProps, children: column.map(({ photo, layout }) => (jsx(PhotoRenderer, { photo: photo, layout: layout, layoutOptions: layoutOptions, renderPhoto: renderPhoto, imageProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.imageProps }, photo.key || photo.src))) }, `column-${columnIndex}`))) }));
};

const computeMasonryLayout = (props) => {
    var _a, _b, _c;
    const { photos, layoutOptions, instrumentation } = props;
    const { spacing, padding, containerWidth } = layoutOptions;
    const columns = Math.min(layoutOptions.columns, Math.max(photos.length, ((_a = layoutOptions.columnConstraints) === null || _a === void 0 ? void 0 : _a.minColumns) || 0));
    (_b = instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.onStartLayoutComputation) === null || _b === void 0 ? void 0 : _b.call(instrumentation);
    const columnWidth = (containerWidth - spacing * (columns - 1) - 2 * padding * columns) / columns;
    if (columnWidth <= 0) {
        return columns > 1
            ? computeMasonryLayout({
                ...props,
                layoutOptions: { ...layoutOptions, columns: columns - 1 },
            })
            : undefined;
    }
    const columnsCurrentTopPositions = [];
    for (let i = 0; i < columns; i += 1) {
        columnsCurrentTopPositions[i] = 0;
    }
    const columnsModel = photos.reduce((acc, photo, index) => {
        const shortestColumn = columnsCurrentTopPositions.reduce((acc, item, i) => item < columnsCurrentTopPositions[acc] - 1 ? i : acc, 0);
        columnsCurrentTopPositions[shortestColumn] =
            columnsCurrentTopPositions[shortestColumn] + columnWidth / ratio(photo) + spacing + 2 * padding;
        acc[shortestColumn].push({ photo, index });
        return acc;
    }, Array.from({ length: columns }).map(() => []));
    const result = columnsModel.map((column) => column.map(({ photo, index }, photoIndex) => ({
        photo,
        layout: {
            width: columnWidth,
            height: columnWidth / ratio(photo),
            index,
            photoIndex,
            photosCount: column.length,
        },
    })));
    (_c = instrumentation === null || instrumentation === void 0 ? void 0 : instrumentation.onFinishLayoutComputation) === null || _c === void 0 ? void 0 : _c.call(instrumentation, result);
    return result;
};

const MasonryLayout = (props) => {
    const { photos, layoutOptions, renderPhoto, renderColumnContainer, componentsProps, instrumentation } = props;
    const masonryLayout = computeMasonryLayout({ photos, layoutOptions, instrumentation });
    if (masonryLayout === undefined)
        return jsx(Fragment, {});
    return (jsx(Fragment, { children: masonryLayout.map((column, columnIndex) => (jsx(ColumnContainerRenderer, { layoutOptions: layoutOptions, columnsCount: masonryLayout.length, columnIndex: columnIndex, renderColumnContainer: renderColumnContainer, columnContainerProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.columnContainerProps, children: column.map(({ photo, layout }) => (jsx(PhotoRenderer, { photo: photo, layout: layout, layoutOptions: layoutOptions, renderPhoto: renderPhoto, imageProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.imageProps }, photo.key || photo.src))) }, `masonry-column-${columnIndex}`))) }));
};

const defaultRenderContainer = ({ containerProps, children, containerRef, }) => (jsx("div", { ref: containerRef, ...containerProps, children: children }));
const ContainerRenderer = (props) => {
    const { layoutOptions, renderContainer, children, containerRef, containerProps: { style, ...restContainerProps } = {}, } = props;
    const { layout } = layoutOptions;
    const containerProps = {
        className: `react-photo-album react-photo-album--${layout}`,
        style: {
            display: "flex",
            flexWrap: "nowrap",
            justifyContent: "space-between",
            flexDirection: layout === "rows" ? "column" : "row",
            ...style,
        },
        ...restContainerProps,
    };
    if (renderContainer && typeof renderContainer === "object") {
        const Component = renderContainer;
        return (jsx(Component, { ref: containerRef, layoutOptions: layoutOptions, containerProps: containerProps, children: children }));
    }
    return (jsx(Fragment, { children: (renderContainer !== null && renderContainer !== void 0 ? renderContainer : defaultRenderContainer)({
            containerProps,
            containerRef,
            layoutOptions,
            children,
        }) }));
};

const useLayoutEffect = typeof window !== "undefined" ? useLayoutEffect$1 : useEffect;

const useEventCallback = (fn) => {
    const ref = useRef(fn);
    useLayoutEffect(() => {
        ref.current = fn;
    });
    return useCallback((...args) => { var _a; return (_a = ref.current) === null || _a === void 0 ? void 0 : _a.call(ref, ...args); }, []);
};

const useContainerWidth = (resizeObserverProvider, breakpoints) => {
    const [containerWidth, setContainerWidth] = useState();
    const [scrollbarWidth, setScrollbarWidth] = useState();
    const ref = useRef(null);
    const observerRef = useRef();
    const updateWidth = useEventCallback(() => {
        var _a;
        let newWidth = (_a = ref.current) === null || _a === void 0 ? void 0 : _a.clientWidth;
        if (newWidth !== undefined && breakpoints && breakpoints.length > 0) {
            const sortedBreakpoints = [...breakpoints.filter((x) => x > 0)].sort((a, b) => b - a);
            sortedBreakpoints.push(Math.floor(sortedBreakpoints[sortedBreakpoints.length - 1] / 2));
            const threshold = newWidth;
            newWidth = sortedBreakpoints.find((breakpoint, index) => breakpoint <= threshold || index === sortedBreakpoints.length - 1);
        }
        const newScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (newScrollbarWidth !== scrollbarWidth) {
            setScrollbarWidth(newScrollbarWidth);
        }
        if (containerWidth !== undefined &&
            scrollbarWidth !== undefined &&
            newWidth !== undefined &&
            newWidth > containerWidth &&
            newWidth - containerWidth <= 20 &&
            newScrollbarWidth < scrollbarWidth) {
            return;
        }
        if (newWidth !== containerWidth) {
            setContainerWidth(newWidth);
        }
    });
    const containerRef = useEventCallback((node) => {
        var _a, _b;
        (_a = observerRef.current) === null || _a === void 0 ? void 0 : _a.disconnect();
        observerRef.current = undefined;
        ref.current = node;
        updateWidth();
        if (node) {
            observerRef.current =
                typeof ResizeObserver !== "undefined"
                    ? new ResizeObserver(updateWidth)
                    : resizeObserverProvider === null || resizeObserverProvider === void 0 ? void 0 : resizeObserverProvider(updateWidth);
            (_b = observerRef.current) === null || _b === void 0 ? void 0 : _b.observe(node);
        }
    });
    return { containerRef, containerWidth };
};

const breakpoints = Object.freeze([1200, 600, 300, 0]);
const unwrap = (value, containerWidth) => typeof value === "function" ? value(containerWidth) : value;
const unwrapParameter = (value, containerWidth) => typeof value !== "undefined" ? unwrap(value, containerWidth) : undefined;
const selectResponsiveValue = (values, containerWidth) => {
    const index = breakpoints.findIndex((breakpoint) => breakpoint <= containerWidth);
    return unwrap(values[index >= 0 ? index : 0], containerWidth);
};
const resolveResponsiveParameter = (parameter, containerWidth, values, minValue = 0) => {
    const value = unwrapParameter(parameter, containerWidth);
    return Math.round(Math.max(value === undefined ? selectResponsiveValue(values, containerWidth) : value, minValue));
};

const resolveLayoutOptions = ({ layout, onClick, viewportWidth, containerWidth, targetRowHeight, rowConstraints, columnConstraints, columns, spacing, padding, sizes, }) => ({
    layout,
    onClick,
    viewportWidth,
    containerWidth,
    columns: resolveResponsiveParameter(columns, containerWidth, [5, 4, 3, 2], 1),
    spacing: resolveResponsiveParameter(spacing, containerWidth, [20, 15, 10, 5]),
    padding: resolveResponsiveParameter(padding, containerWidth, [0, 0, 0, 0, 0]),
    targetRowHeight: resolveResponsiveParameter(targetRowHeight, containerWidth, [
        (w) => w / 5,
        (w) => w / 4,
        (w) => w / 3,
        (w) => w / 2,
    ]),
    rowConstraints: unwrapParameter(rowConstraints, containerWidth),
    columnConstraints: unwrapParameter(columnConstraints, containerWidth),
    sizes,
});
const resolveComponentsProps = (componentsProps, containerWidth) => typeof componentsProps === "function" ? componentsProps(containerWidth) : componentsProps;
const PhotoAlbum = (props) => {
    const { photos, layout, renderPhoto, renderContainer, renderRowContainer, renderColumnContainer, defaultContainerWidth, resizeObserverProvider, breakpoints, instrumentation, } = props;
    const [mounted, setMounted] = useState(false);
    const { containerRef, containerWidth } = useContainerWidth(resizeObserverProvider, breakpoints);
    useLayoutEffect(() => setMounted(true), []);
    if (!layout || !["rows", "columns", "masonry"].includes(layout) || !Array.isArray(photos))
        return jsx(Fragment, {});
    const layoutOptions = resolveLayoutOptions({
        containerWidth: (mounted && containerWidth) || defaultContainerWidth || 800,
        viewportWidth: (mounted && window.innerWidth) || undefined,
        ...props,
    });
    const componentsProps = resolveComponentsProps(props.componentsProps, layoutOptions.containerWidth);
    const commonLayoutProps = { photos, renderPhoto, componentsProps, instrumentation };
    return (jsx(ContainerRenderer, { containerRef: containerRef, layoutOptions: layoutOptions, renderContainer: renderContainer, containerProps: componentsProps === null || componentsProps === void 0 ? void 0 : componentsProps.containerProps, children: layout === "rows" ? (jsx(RowsLayout, { layoutOptions: layoutOptions, renderRowContainer: renderRowContainer, ...commonLayoutProps })) : layout === "columns" ? (jsx(ColumnsLayout, { layoutOptions: layoutOptions, renderColumnContainer: renderColumnContainer, ...commonLayoutProps })) : (jsx(MasonryLayout, { layoutOptions: layoutOptions, renderColumnContainer: renderColumnContainer, ...commonLayoutProps })) }));
};

export { PhotoAlbum, PhotoAlbum as default };
