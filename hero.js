// 初始化状态
window.onload = function () {
    let content = document.querySelector('.content')
    let head_img_src = document.querySelector('.head_img_src')
    let userName = document.querySelector('.userName')
	let userContent = document.querySelector('.userContent')
    if(localStorage.getItem('user') !== null){
        let userData = JSON.parse(localStorage.getItem('user'))
        if(userData.type == 1){
            content.style.background = '#EDF6FD'
            head_img_src.src = 'image/user1.png'
        }else {
            content.style.background = '#E6FFF7'
            head_img_src.src = 'image/user2.png'
        }
        userName.innerHTML = userData.name
		userContent.innerHTML = userData.content
    }
}

let DataArr = [] // 存放整体数据
let filterArr = [] // 存放过滤数据
let selectedData = [] // 选中的英雄数据

let dif_ipt = document.querySelector('#dif_ipt')
let dif_number = document.querySelector('.dif_number')
let Difficulty = 10  // 难度
dif_ipt.onchange = function () {
    dif_number.innerHTML = this.value
    Difficulty = this.value
    dataChanges()
}
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
// 存放勾选后的数据
let selectedOptions = Array.from(checkboxes).map(cb => cb.value);
// 给每个复选框绑定事件
checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        if (cb.checked) {
            if (!selectedOptions.includes(cb.value)) {
                selectedOptions.push(cb.value);
            }
        } else {
            selectedOptions = selectedOptions.filter(val => val !== cb.value);
        }
        dataChanges()
    });
});

d3.csv("champion_stats.csv").then(function (data) {
    // 获取数据信息
    DataArr = data
    for (let i = 0; i < DataArr.length; i++) {
        DataArr[i].tags = JSON.parse(DataArr[i].tags.replace(/'/g, '"'))
    }
    filterArr = [...DataArr]
    console.log(filterArr);
    dataChanges()
}).catch(function (error) {
    console.error("加载 CSV 时出错:", error);
});

// 筛选数据
function dataChanges() {
    filterArr = DataArr.filter(d => d.tags.some(item => selectedOptions.includes(item)) && Number(d.defense) <= Difficulty);
    selectedData = []
    createDom()
}

// 创建英雄列表
function createDom() {
    let hero_list = document.querySelector('.hero_list')
    let heroHtml = ``
    for (let i = 0; i < filterArr.length; i++) {
        heroHtml = heroHtml + `<div class="${filterArr[i].id}" onclick="selectedFun(this,filterArr[${i}])">
                    <img src="image/${filterArr[i].id}.png"/>
                    <span>${filterArr[i].id}</span>
                    <div class="difficulty_text">${filterArr[i].defense}</div>
                </div>`
    }
    hero_list.innerHTML = heroHtml
}

// 追加选中的数据
function selectedFun(val, item) {
    if (!val.classList.contains('hero_active')) {
        val.classList.add('hero_active')
        if (selectedData.length < 2) {
            selectedData.push(item)
        } else {
            document.querySelector('.' + selectedData[0].id).classList.remove('hero_active')
            // 删除第一个值
            selectedData.shift()
            selectedData.push(item)
        }
    }
}


function drawRadarChart(containerId, data) {
    const width = document.querySelector('.chat_one').offsetWidth - 40;
    const height = 500;
    const radius = 180;
    const levels = 5;
    const center = {x: width / 2, y: height / 2};
    const svg = d3.select(containerId);
    svg.selectAll("*").remove(); // 清空旧图

    const allAxis = data[0].attributes.map(d => d.axis);
    const angleSlice = (Math.PI * 2) / allAxis.length;
    const maxValue = 10;

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "6px 10px")
        .style("background", "#222")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // 画网格层
    for (let level = 1; level <= levels; level++) {
        const r = (radius / levels) * level;
        svg.append("polygon")
            .attr("points", allAxis.map((_, i) => {
                const angle = i * angleSlice;
                const x = center.x + r * Math.cos(angle - Math.PI / 2);
                const y = center.y + r * Math.sin(angle - Math.PI / 2);
                return `${x},${y}`;
            }).join(" "))
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 0.5);
    }

    // 画轴线和标签
    allAxis.forEach((axis, i) => {
        const angle = i * angleSlice;
        const x = center.x + radius * Math.cos(angle - Math.PI / 2);
        const y = center.y + radius * Math.sin(angle - Math.PI / 2);

        svg.append("line")
            .attr("x1", center.x)
            .attr("y1", center.y)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", "#999");

        svg.append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("class", "axisLabel")
            .text(axis);
    });

    const color = d3.scaleOrdinal()
        .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]);

    // 绘制每个英雄的数据
    data.forEach((hero, idx) => {
        const points = hero.attributes.map((d, i) => {
            const angle = i * angleSlice;
            const r = (d.value / maxValue) * radius;
            const x = center.x + r * Math.cos(angle - Math.PI / 2);
            const y = center.y + r * Math.sin(angle - Math.PI / 2);
            return [x, y];
        });

        // 多边形动画
        const polygon = svg.append("polygon")
            .attr("fill", color(idx))
            .attr("fill-opacity", 0.3)
            .attr("stroke", color(idx))
            .attr("stroke-width", 2)
            .attr("points", points.map(() => `${center.x},${center.y}`).join(" "));

        polygon.transition()
            .duration(800)
            .attr("points", points.map(p => p.join(",")).join(" "));

        // 顶点交互点
        // 创建一个 pointsGroup 分组，统一管理所有交互点（放在雷达图区域之后）
        const pointsGroup = svg.append("g").attr("class", "points-group");

        data.forEach((hero, idx) => {
            const heroGroup = pointsGroup.append("g")
                .attr("class", "hero-points")
                .attr("data-hero", hero.name);

            hero.attributes.forEach((d, i) => {
                const angle = i * angleSlice;
                const r = (d.value / maxValue) * radius;
                const x = center.x + r * Math.cos(angle - Math.PI / 2);
                const y = center.y + r * Math.sin(angle - Math.PI / 2);

                heroGroup.append("circle")
                    .attr("cx", center.x)
                    .attr("cy", center.y)
                    .attr("r", 4)
                    .attr("fill", color(idx))
                    .style("cursor", "pointer")
                    .on("mouseover", function (event) {
                        d3.select(this)
                            .transition().duration(200)
                            .attr("r", 8)
                            .attr("fill", "#fff")
                            .attr("stroke", color(idx))
                            .attr("stroke-width", 2);

                        tooltip.transition().duration(200).style("opacity", 0.95);
                        tooltip.html(`<strong>${hero.name}</strong><br>${d.axis}: ${d.value}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 30) + "px");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition().duration(200)
                            .attr("r", 4)
                            .attr("fill", color(idx))
                            .attr("stroke", "none");

                        tooltip.transition().duration(300).style("opacity", 0);
                    })
                    .transition()
                    .duration(800)
                    .attr("cx", x)
                    .attr("cy", y);
            });
        });


    });

    // 图例
    data.forEach((hero, idx) => {
        svg.append("circle")
            .attr("cx", 30)
            .attr("cy", 30 + idx * 20)
            .attr("r", 6)
            .attr("fill", color(idx));

        svg.append("text")
            .attr("x", 45)
            .attr("y", 34 + idx * 20)
            .text(hero.name)
            .attr("class", "legend")
            .attr("fill", "#333");
    });
}


function drawBarChart(containerId, heroData) {
    const margin = {top: 40, right: 20, bottom: 60, left: 60};
    const width = document.querySelector('.chat_one').offsetWidth - 40;
    const height = 500;

    // 清空旧图表
    d3.select(containerId).select("svg").remove();
    d3.select(containerId).select(".tooltip-bar").remove();

    const svg = d3.select(containerId)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select(containerId)
        .append("div")
        .attr("class", "tooltip-bar");

    const attributes = ["hp", "mp", "movespeed", "attackrange"];
    const color = d3.scaleOrdinal()
        .domain(heroData.map(d => d.name))
        .range(["#1f77b4", "#ff7f0e"]);

    const allData = [];

    heroData.forEach(hero => {
        attributes.forEach(attr => {
            allData.push({
                hero: hero.name,
                attribute: attr,
                value: hero.stats[attr]
            });
        });
    });

    const x0 = d3.scaleBand()
        .domain(attributes)
        .range([margin.left, width - margin.right])
        .paddingInner(0.2);

    const x1 = d3.scaleBand()
        .domain(heroData.map(d => d.name))
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.value) * 1.1])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // x 轴
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("font-size", "13px");

    // y 轴
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "13px");

    // 柱状图组
    const barsGroup = svg.append("g");

    const groups = barsGroup.selectAll(".bar-group")
        .data(attributes)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x0(d)},0)`);

    groups.selectAll("rect")
        .data(attr => heroData.map(hero => ({
            hero: hero.name,
            attribute: attr,
            value: hero.stats[attr]
        })))
        .enter()
        .append("rect")
        .attr("x", d => x1(d.hero))
        .attr("y", d => y(0))
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", d => color(d.hero))
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("fill", d3.color(color(d.hero)).darker(1))
                .attr("width", x1.bandwidth() + 4)
                .attr("x", x1(d.hero) - 2);

            tooltip
                .style("opacity", 1)
                .html(`<strong>${d.hero}</strong><br>${d.attribute}: ${d.value}`)
                .style("left", (event.offsetX - 30) + "px")
                .style("top", (event.offsetY - 30) + "px");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", (event.offsetX - 30) + "px")
                .style("top", (event.offsetY - 30) + "px");
        })
        .on("mouseout", function (event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("fill", color(d.hero))
                .attr("width", x1.bandwidth())
                .attr("x", x1(d.hero));

            tooltip.style("opacity", 0);
        })
        .transition()
        .duration(800)
        .attr("y", d => y(d.value))
        .attr("height", d => y(0) - y(d.value));


    // 图例 legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin.left}, ${height - 15})`);

    const legendSpacing = 100;

    const legendItems = legend.selectAll(".legend-item")
        .data(heroData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * legendSpacing}, 0)`);

// 颜色块
    legendItems.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => color(d.name));

// 英雄名称
    legendItems.append("text")
        .attr("x", 24)
        .attr("y", 13)
        .text(d => d.name)
        .style("font-size", "13px");

}


//点击对比按钮
let generate_btn = document.querySelector('.generate_btn')
generate_btn.onclick = function () {
    if (selectedData.length < 2) {
        return alert('Please select two heroes')
    }
    let hero_img_list1 = document.querySelectorAll('.hero_img_list1')
    let hero_img_list2 = document.querySelectorAll('.hero_img_list2')
	let hero_label1= document.querySelectorAll('.hero_label1')
	let hero_label2= document.querySelectorAll('.hero_label2')
    hero_img_list1[0].src = 'image/' + selectedData[0].id + '.png'
	hero_label1[0].innerText = ''+selectedData[0].tags
    hero_img_list1[1].src = 'image/' + selectedData[0].id + '.png'
    hero_img_list2[0].src = 'image/' + selectedData[1].id + '.png'
	hero_label2[0].innerText = ''+selectedData[1].tags
    hero_img_list2[1].src = 'image/' + selectedData[1].id + '.png'
    const heroData = [
        {
            name: selectedData[0].id,
            attributes: [
                {axis: "attack", value: selectedData[0].attack},
                {axis: "defense", value: selectedData[0].defense},
                {axis: "magic", value: selectedData[0].magic},
                {axis: "difficulty", value: selectedData[0].difficulty},
            ]
        },
        {
            name: selectedData[1].id,
            attributes: [
                {axis: "attack", value: selectedData[1].attack},
                {axis: "defense", value: selectedData[1].defense},
                {axis: "magic", value: selectedData[1].magic},
                {axis: "difficulty", value: selectedData[1].difficulty},
            ]
        }
    ];
    drawRadarChart("#radarChart", heroData);
    drawBarChart("#barChart", [
        {
            name: selectedData[0].id,
            stats: {
                hp: selectedData[0].hp,
                mp: selectedData[0].mp,
                movespeed: selectedData[0].movespeed,
                attackrange: selectedData[0].attackrange
            }
        },
        {
            name: selectedData[1].id,
            stats: {
                hp: selectedData[1].hp,
                mp: selectedData[1].mp,
                movespeed: selectedData[1].movespeed,
                attackrange: selectedData[1].attackrange
            }
        }
    ]);

}
