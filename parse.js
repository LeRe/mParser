var megafonParser = (function() {
	var message = document.createElement("div"); 
	var control = document.createElement("input");

	message.id = "message";
	message.style.border = "2px solid blue";
	message.style.margin = "20px";
	message.style.padding = "20px";
	message.style.display = "inline-block";
	message.innerHTML = "Перетащите файл со статистикой...";

	control.id = "fileInputField";
	control.type = "file";
	control.accept = "text/html";
	control.style.margin = "20px";
	control.style.display = "none";

	document.body.appendChild(control);
	document.body.appendChild(message);

	/** Создает меню и управляет выводом накопленных данных.*/
	var oVisualizer = 
	{
		/**
			@var arObservedItems массив объектов реализующих метод visualise()
					метод будет возвращать объект содержащий свойства:
						name - имя меню,
						items - массив объектов свойства которого содержат id, label - текст для метки, html - html ком который необходимо вывести
				{
					name: 'name1',
					items: [
						{
							id: 'id1',
							label: 'text label1',
							html: 'text html1'
						},
						{
							id: 'id2',
							label: 'text label2',
							html: 'text html2'
						},
					]
				}	
		*/
		arObservedItems: [],
		addItemForObserv: function(item)
			{
				if('visualise' in item)
				{
					this.arObservedItems.push(item);
				}
			},
		itemColor: ['maroon', 'red', 'orange', 'yellow', 'olive', 'lime', 'green', 'aqua', 'blue', 'navy', 'teal', 'fuchsia', 'purple'],
		menuHandler: function(event) {
			var elDiv, elLabel;
			var color = '';
			var shuffle = function(o){
	 			for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	    		return o;
			}

			elLabel = document.getElementById(event.srcElement.id.replace('chbox-','label-')); 
			elDiv = document.getElementById(event.srcElement.id.replace('chbox-','info-'));
			if(event.target.checked) 
			{
				color = this.itemColor.pop();			
				elLabel.style.color = color;			
				elDiv.style.borderColor = color;
				elDiv.style.display = 'inline-block';
			}
			else
			{
				color = elLabel.style.color;
				this.itemColor.push(color);
				shuffle(this.itemColor);
				elLabel.style.color = 'black';
				elDiv.style.display = 'none';			
			}
		},
		reBuild: function() {
			var menu, info, body;
			var menuHtml, infoHtml;
			menu = document.getElementById("menu");
			info = document.getElementById("info");

			if(menu == null || info == null)
			{
				if(menu != null) menu.remove();
				if(info != null) info.remove();

				menu = document.createElement("div");
				menu.id = 'menu';

				info = document.createElement("div");
				info.id = 'info';

				body = document.getElementsByTagName("body")[0];
				body.appendChild(menu);
				body.appendChild(info);

				menu.addEventListener("change", this.menuHandler.bind(oVisualizer));
			}

			menu.innerHTML = '';
			info.innerHTML = '';

			menuHtml = '';
			infoHtml = '';
			this.arObservedItems.forEach(function(el){
				oMenuData = el.visualise();

				menuHtml += oMenuData.name + '<br>';
				oMenuData.items.forEach(function(item){
					menuHtml += '<label id="label-' + item.id + '" style="margin-right: 30px;">'+ item.label 
								+ '<input id="chbox-' + item.id + '" type="checkbox"></label>';
					infoHtml += '<div style="display: none; border: 2px solid black; border-radius: 10px; margin: 5px; padding: 10px;" id="info-' + 
									item.id + '">' + item.html + '</div>';
				});
				menuHtml +='<br><br>';
			});

			menu.innerHTML = menuHtml;
			info.innerHTML = infoHtml;
		}
	}

	/**	Контролирует видимость поля для отправки файлов
	*/
	var objFileInputField = 
	{
		isVisible: false,
		/** Изменяет видимость поля для отправки файлов

			@param visible если задано и равно true: показывает поле.
							Если равно false: скрывает поле. Если параметр не задан состояние видимости меняется основываясь
							на состоянии свойства isVisible 

		*/
		changeVisibility: function(visible)
			{
				if(visible === true)
				{
					control.style.display = "block";
					message.style.display = "none";	
					this.isVisible = true;				
				}
				else if(visible === false)
				{
					control.style.display = "none";
					message.style.display = "inline-block";
					this.isVisible = false;
				}
				else
				{
					if(this.isVisible) {
						control.style.display = "none";
						message.style.display = "inline-block";
						this.isVisible = false;
					} 
					else
					{
						control.style.display = "block";
						message.style.display = "none";		
						this.isVisible = true;
					}
				}
			}
	};

	/** Обрабатывает детализацию вызовов. Готовит данные к пересчету по другим тарифным планам.
	*/
	var objData = function()
	{
		this.name = 'Данные детализации';
		this.ownerName = '';
		this.ownerPhone = '';
		this.totalRecodsMust = 0;
		this.totalCostMust = 0;
		this.dataServices = [];
		this.dataNotUsed = [];
	/*
		dataServices: [] - массив содержащий в своих элементах следующие массивы данных:
			[
				Дата,
				Время,
				(Абонентский номер, адрес электронной почты, точка доступа),
				(Прод/ Объем),
				(Единица тарификации (мин, сек, шт, Kb, Mb)),
				(Вид услуги),
				(Место вызова)
			]

		dataNotUsed - массив с данными которые не прошли через метод parseTextArray()
	*/
	}

	/** Разбирает детализацию переданную в виде DOM элемента.
		Полезные данные содержатся в ячейках таблиц. 
		Из каждой строки таблицы создается массив, элементами которого будет содержимое ячеек.
		Для полученных массивов вызывается метод parseTextArray(textArray)

		@param elementDOM исходный текст файла детализации уже помещенный элемент DOM типа  DIV
	*/
	objData.prototype.parseElementDOM = function(elementDOM) {
		var tables;
		var tableClone;
		var i, j, k;

		tables = elementDOM.getElementsByTagName("table");
		for(i=0;i<tables.length; i++)
		{
			tableClone = tables[i].cloneNode(true);

			rows = tableClone.getElementsByTagName('tr');
			for(j = 0; j<rows.length; j++)
			{
				cells = rows[j].getElementsByTagName('td');
				arCellInnerText = [];
				for(k = 0; k < cells.length; k++)
				{	
					arCellInnerText.push(cells[k].innerHTML.trim());
				}

				if(!this.parseTextArray(arCellInnerText))
				{
					//отбросим пустые массивы
					if(arCellInnerText.join('').length > 0)
					{
						this.dataNotUsed.push(arCellInnerText);	
					}
				}
			}
		}
	};

	/** Извлекает полезные данные из массива массивов и раскладывает их по соответствующим свойствам объекта. 
		Данные не удовлетворяющие условиям помещаются в массив dataNotUsed для последующего анализа.

		@param textArray массив элементы которого являются массивами и соответствую строкам таблицы детализации.
					 Элементы вложенных массивов получены из ячеек исходной таблицы детализации.

	*/
	objData.prototype.parseTextArray = function(textArray) {
		/**
		нам необходимо выдернуть некоторые данные из детализации.
		Примеры:
			1) имя хозяина телефона
					{}{}{}{}{Иванов Иван Иванович}{}{}
					7 элементов в массиве, значащая информация в элементе с индексом 4

			2) абонентский номер
					{Детализация оказанных услуг по Абонентскому номеру 9265577619}
					1 элемент в массиве, значащая информация в элементе с индексом 0, 
					для очистки/проверки необходимо использовать регулярное выражение 

			3) строки имеющие информацию об услугах
					{23.09.15}{22:29:52}{79250000000}{00:11}{Секунда}{на МегаФон домашнего региона}{ }{0.37}
					8 элементов в массиве, первый и второй элементы не пустые и не равны "Дата" "Время" соответственно
			4) Итоговые данные
				{Итого по абоненту:}{Записей:}{528}{Стоимость:}{237.90}
				5 элементов в массиве.
				Первый, второй, четвертый элемент - соответствующии текстовые константы
				выдергиваем третий и пятый элементы в соответствующие свойства объекта.
		*/
		var sumStringLength = 0;
		var isFind = false;
		switch(textArray.length) {
			case 1:		
				if(this.ownerPhone.length == 0 && textArray.length ==1 && textArray[0].length > 50) 
				{
					var re = /^Детализация оказанных услуг по Абонентскому номеру\s+(\d{10})/;
					var result = re.exec(textArray[0]);				
					if(result !== null) 
					{
						this.ownerPhone = result[1];
						isFind = true;
					}
				}
			break;
			case 5:
				if(textArray.length == 5 && (textArray[0] == 'Итого по абоненту:' && 
												textArray[1] == 'Записей:' &&
												textArray[3] == 'Стоимость:'))
				{
					this.totalRecodsMust = textArray[2];
					this.totalCostMust = textArray[4];
					isFind = true;
				}
			break;
			case 7:
				if(this.ownerName.length == 0)
				{
					textArray.forEach(function(currentValue, index){
						if(index != 4) 
						{
							sumStringLength += currentValue.length;
						}
					});
					if(sumStringLength == 0 && textArray[4].length != 0)
					{
						this.ownerName = textArray[4];
						isFind = true;
					}
				}
			break;
			case 8:
				if( (textArray[0].length + textArray[1].length) > 0 && (textArray[0] != 'Дата' && textArray[1] != 'Время')) 
				{
					textArray[7] = parseFloat(textArray[7]);

					this.dataServices.push(textArray);
					isFind = true;
				}			
			break;	
		}
		return isFind;
	};

	/** Подготавливает данные для визуализации объекта
		@return объект который может быть визуализирован объектом oVisualizer или false в случае когда нечего визуализировать.
	*/
	objData.prototype.visualise = function() {
		var rawHtml = '';
		var label = '';
		var id = '';
		var oVisual = 
			{
				name: '',
				items: [] 
			};	
				// {
				// 	name: 'name1',
				// 	items: [
				// 		{
				// 			id: 'id1',
				// 			label: 'text label1',
				// 			html: 'text html1'
				// 		},
				// 		{
				// 			id: 'id2',
				// 			label: 'text label2',
				// 			html: 'text html2'
				// 		},
				// 	]
				// }

		if(this.ownerName == '' && this.ownerPhone == '' && this.dataServices.length == 0) {return false;}

		if(this.name.length > 0 )
		{
			oVisual.name = this.name;	
		}

		id = 'stat';
		label = 'Исходная статистика';
		rawHtml = '';
		rawHtml += 'Хозяин телефона: ' + this.ownerName + '<br>';
		rawHtml += 'Номер телефона: ' + this.ownerPhone + '<br>';
		rawHtml += 'Должно быть записей: ' + this.totalRecodsMust + '<br>';
		rawHtml += 'Стоимость должна составить: ' + this.totalCostMust + '<br>';
		rawHtml += 'Фактически записей: ' + this.dataServices.length + '<br>';
		var factCost = 0;
		this.dataServices.forEach(function(element){
			factCost += element[7];
		});
		rawHtml += 'Фактическая стоимость: ' + factCost.toFixed(2) + '<br>';
		oVisual.items.push({id: id, label: label, html: rawHtml});

		id = "usefull";
		label = 'Полезные данные';
		rawHtml = '';
		rawHtml = '<table border="1" style="border-collapse: collapse;">';
		rawHtml += '<tr><td>Дата</td><td>Время</td><td>Абонентский номер,<br>адрес электронной почты,<br>точка доступа</td>' +
					'<td>Прод/ Объем</td><td>Единица тарификации<br>(мин, сек, шт, Kb, Mb)</td><td>Вид услуги</td>' +
					'<td>Место<br>вызова</td><td>Стоимость<br>(с НДС), руб.</td></tr>';
		this.dataServices.forEach(function(element){
				rawHtml += '<tr>';
				element.forEach(function(element){
					rawHtml += '<td style="padding: 10px;">' + element + '</td>';
				});
				rawHtml += '</tr>';
			});
		rawHtml += '</table>';
		oVisual.items.push({id: id, label: label, html: rawHtml});

		id = 'un-usefull';	
		label = 'Не использованные данные';
		rawHtml = '';
		rawHtml += 'Данные не использованные в отборе за исключением пустых строк исходных таблиц:<br>';
		this.dataNotUsed.forEach(function(element){
				element.forEach(function(element){
					rawHtml += element + ' ';
				});
				rawHtml += '<br>';
		});
		oVisual.items.push({id: id, label: label, html: rawHtml});

		id = 'services';
		label = 'Список услуг';
		rawHtml = '';
		rawHtml += 'Список услуг (повторы исключены):<br>';
		var listServices = [];
		this.dataServices.forEach(function(element) {
			listServices.push(element[5]);
		});

	    var i = listServices.length;
		listServices.sort();
		while (i--) {
		    if (listServices[i] == listServices[i-1]) {
		        listServices.splice(i, 1);
		    }
		}

		listServices.forEach(function(element){
			rawHtml += element + '<br>';
		});
		oVisual.items.push({id: id, label: label, html: rawHtml});	


		return oVisual;
	}	

	/** Очищает объект, как правило используется перед загрузкой новой детализации
	*/
	objData.prototype.clear = function()
	{
		this.ownerName = '';
		this.ownerPhone = '';
		this.totalRecodsMust = 0;
		this.totalCostMust = 0;
		this.dataServices.splice(0, this.dataServices.length);
		this.dataNotUsed.splice(0, this.dataNotUsed.length);
	}

	/** Объект для работы с таривными планами
	*/
	var objTariffPlan = function(name, id, rules)
	{
		this.name = name;
		this.id = id;

		/**
			this.rules  - массив объектов, каждый объект описывает правило по которому производится пересчет
						  описание производится в свойствах объекта 
							{
								nameService: 'на МегаФон домашнего региона',        - название услуги
								cost: 0                                             - стоимость
								единицаТарификации: мин/сек/мб....                  - используется если стоимость не ноль
							}

		*/
		this.rules = rules
		this.processedData =[];
		this.unprocessedData = [];
		this.conversionRules = [];
	};

	/** Загружает данные по потребленным услугам в тарифный план.
		При загрузке делает попытку обработать загружаемые данные, в зависимости от результатов обработки 
		помещает данные в соответствующие массивы.  

		@param arData массив в качестве элементов содержащий массивы с информацие о потребленных услугах:
					[
					  Дата,
					  Время,
					  Абонентский номер, адрес электронной почты, точка доступа
					  Прод/ Объем
					  Единица тарификации (мин, сек, шт, Kb, Mb)
					  Вид услуги
					  Место вызова
					  Стоимость (с НДС), руб.
					]
	*/
	objTariffPlan.prototype.loadData = function(arData) {
		var recalcElement = [];
		var self = this;

		arData.forEach(function(element){
			if(!(recalcElement = self.recalculate(element.slice()))){
				self.unprocessedData.push(element.slice());
			}
			else
			{
				self.processedData.push(recalcElement);
			}
		});
	};

	/**	Пересчитывает стоимость оказанной услуги.
		@param arService массив содержащий информацию по услуге
		@return false если пересчет произвести не удалось или измененный массив в случае успешного пересчета
	*/
	objTariffPlan.prototype.recalculate = function(arService) {
		var result = false;
		var self = this;
		var saleVolume = 0;

		self.rules.forEach(function(rule){
			if(arService[5] == rule.nameService)
			{
				if( (saleVolume = self.convertSale(arService[3], rule.units)) !== false)
				{
					arService[7] = saleVolume * rule.cost;
					result = arService;
				}
			}
		});
		return result;
	};

	/**	Преобразует объем проданного в рамках услуги и к требуемым единицам

		@param sale объем проданного (время, мегабайты, штуки)
		@param tarifUnits единицы к которым необходимо привести объем проданного

		@return возвращает false в случае неудачного преобразования, иначе возвращает преобразованное значение
	*/
	objTariffPlan.prototype.convertSale = function(sale, tarifUnits) {
		switch(tarifUnits)
		{
			case 'Секунда':
				// sale предположительно содержит nn:nn, первое nn минуты, второе nn секунды
				sale = 0; //заглушка
			break;
			case 'Минута':
				sale = 0; //заглушка
			break;
			case 'Шт.':
				sale = parseInt(sale);
				if(isNaN(sale)) 
				{
					sale = false;
				}
			break;
			case 'Мб.':
				sale = parseFloat(sale);
				if(isNaN(sale)) 
				{
					sale = false;
				}
			break;
		}
		return sale;
	};

	/** Очищает объект, как правило используется перед загрузкой новой детализации
	*/
	objTariffPlan.prototype.clear = function()
	{
		this.processedData.splice(0, this.processedData.length);
		this.unprocessedData.splice(0, this.unprocessedData.length);
		this.conversionRules.splice(0, this.conversionRules.length);
	}

	/** Подготавливает данные для визуализации объекта
		@return объект который может быть визуализирован объектом oVisualizer или false в случае когда нечего визуализировать.
	*/
	objTariffPlan.prototype.visualise = function()
	{
		var rawHtml = '';
		var label = '';
		var id = '';
		var oVisual = 
			{
				name: '',
				items: [] 
			};	
				// {
				// 	name: 'name1',
				// 	items: [
				// 		{
				// 			id: 'id1',
				// 			label: 'text label1',
				// 			html: 'text html1'
				// 		},
				// 		{
				// 			id: 'id2',
				// 			label: 'text label2',
				// 			html: 'text html2'
				// 		},
				// 	]
				// }

		if(this.name.length > 0 )
		{
			oVisual.name = 'Информация по тарифному плану: ' + this.name;	
		}

		id = 'stat-' + this.id + '-';
		label = 'Статистика';
		rawHtml = '';
		rawHtml += 'По тарифному плану: ' + this.name + '<br>' +
					'Колличество обработанных записей: ' + this.processedData.length + '<br>' +
					'Колличесто не обработанных записей: ' + this.unprocessedData.length + '<br>';
		var cost = 0;
		this.processedData.forEach(function(element){
			cost += element[7];
		});
		this.unprocessedData.forEach(function(element){
			cost += element[7];
		});
		rawHtml += 'Платеж составит: ' + cost + '<br>';
		oVisual.items.push({id: id, label: label, html: rawHtml});	

		id = this.id + '-' + 'recalc';
		label = 'Пересчитанные данные';
		rawHtml = '';
		rawHtml = '<table border="1" style="border-collapse: collapse;">';
		rawHtml += '<tr><td>Дата</td><td>Время</td><td>Абонентский номер,<br>адрес электронной почты,<br>точка доступа</td>' +
					'<td>Прод/ Объем</td><td>Единица тарификации<br>(мин, сек, шт, Kb, Mb)</td><td>Вид услуги</td>' +
					'<td>Место<br>вызова</td><td>Стоимость<br>(с НДС), руб.</td></tr>';
		this.processedData.forEach(function(element){
				rawHtml += '<tr>';
				element.forEach(function(element){
					rawHtml += '<td style="padding: 10px;">' + element + '</td>';
				});
				rawHtml += '</tr>';
			});
		rawHtml += '</table>';
		oVisual.items.push({id: id, label: label, html: rawHtml});

		id = this.id + '-' + 'no-recalc';
		label = 'Непересчитанные данные';
		rawHtml = '';
		rawHtml = '<table border="1" style="border-collapse: collapse;">';
		rawHtml += '<tr><td>Дата</td><td>Время</td><td>Абонентский номер,<br>адрес электронной почты,<br>точка доступа</td>' +
					'<td>Прод/ Объем</td><td>Единица тарификации<br>(мин, сек, шт, Kb, Mb)</td><td>Вид услуги</td>' +
					'<td>Место<br>вызова</td><td>Стоимость<br>(с НДС), руб.</td></tr>';
		this.unprocessedData.forEach(function(element){
				rawHtml += '<tr>';
				element.forEach(function(element){
					rawHtml += '<td style="padding: 10px;">' + element + '</td>';
				});
				rawHtml += '</tr>';
			});
		rawHtml += '</table>';
		oVisual.items.push({id: id, label: label, html: rawHtml});

		return oVisual;
	}

	/** Создадим основной объект*/
	var oData = new objData();

	/** Cоздадим тарифные планы

			[
				{
					nameService: '', - название услуги из детализации
					units: '', - единицы измерения 
					cost: 0 - стоимость в рублях
				},
			....
	*/
	tpZero = new objTariffPlan('Переходи на НОЛЬ', 'zero',
			[
				{
					nameService: 'на МегаФон домашнего региона',
					units: 'Минута',
					cost: 0
				},
				{
					nameService: 'с номеров МегаФон дом. региона',
					units: 'Минута',
					cost: 0				
				},
				{
					nameService: 'на мобильные номера дом. региона',
					units: 'Минута',
					cost: 2.5				
				},			
				{
					nameService: 'с мобильных номеров дом. региона',
					units: 'Минута',
					cost: 0				
				},
				{
					nameService: 'на номера Московской обл.',
					units: 'Минута',
					cost: 2.5				
				},
				{
					nameService: 'Входящий',
					units: 'Минута',
					cost: 0				
				},			
				{
					nameService: 'Мобильный интернет',
					units: 'Мб.',
					cost: 0				
				},
				{
					nameService: 'Входящее SMS',
					units: 'Шт.',
					cost: 0
				},
				{
					nameService: 'Радар',
					units: 'Шт.',
					cost: 3
				}
			]		
		);

	/** Обрабатывает данные, пересчитывает в соответствии с заданными тарифными планами, выводит полученную информацию
	@param rData содержимое html файла с детализацией
	*/
	function parseData(rData) 
	{
		var elDOM;

		elDOM = document.createElement('div');
		elDOM.innerHTML = rData;

		oData.clear();		
		oData.parseElementDOM(elDOM);

		tpZero.clear();
		tpZero.loadData(oData.dataServices);

		oVisualizer.arObservedItems.splice(0, oVisualizer.arObservedItems.length);
		oVisualizer.addItemForObserv(oData);
		oVisualizer.addItemForObserv(tpZero);
		oVisualizer.reBuild();
	}

	/**	Читает детализацию из файла.
		@param filesObj объект File  
		*/
	function loadFilesContent(filesObj) {
		var rawData;
	    var i = 0, reader = new FileReader();

	    reader.onload = function(event)
	    {
	   		rawData = event.target.result;
	   		parseData(rawData);   		
	    }

	    for (; i < filesObj.length; i++) {
	    	reader.readAsText(filesObj[i]);
	    }
	}

	//Назначим обработчики событий
	message.addEventListener("click", objFileInputField.changeVisibility, false);

	document.addEventListener("dragover" ,function(event) {
		event.preventDefault();
	});
	document.addEventListener("drop" ,function(event) {
		event.preventDefault();
		control.files = event.dataTransfer.files;
		objFileInputField.changeVisibility();
	});

	control.addEventListener("change", function(event) {
		loadFilesContent(control.files);
	}, false);
}());