"use strict";

$(function () {
    const MAP_BACKGROUND_COLOUR = "#F0F0F0";
    const INACTIVE_MAP_COLOUR = "#D0D0D0";
    const CHART_BACKGROUND_LINE_COLOUR = "#505050";
    const CHART_FOREGROUND_LINE_COLOUR = "#A0A0A0";
    const ACTIVE_MAP_COLOURS = [
        "#E1002A",
        "#CB003B",
        "#B4004D",
        "#990062",
        "#850072",
        "#6D0084",
        "#540098",
        "#3D00AA",
        "#2600BC",
        "#0E00CF"
    ];

    const BUTTON_TYPE = Object.freeze({
        TITLE: {
            getCaption: getFilmTitleAndYear,
            getTip: getFilmState
        },
        STATE: {
            getCaption: getFilmState,
            getTip: getFilmTitleAndYear
        }
    });

    const SORT_FUNCTION = Object.freeze({
        TITLE: film => film.title.sortable(),
        TITLE_LENGTH: film => film.title.replaceAll(" ", "").length,
        STATE: film => film.state,
        YEAR: film => film.year
    });

    let _map;
    let _films = {};
    let _filmsSortedByState = [];
    let _filmsSortedByTitle = [];

    initialiseEventHandlers();

    loadData(() => {
        initialiseCount();
        initialiseMap();
        initialiseStatesList();
        initialiseMoviesList();
        initialiseStats();
    });

    //-----------------------------------------------------------

    function initialiseEventHandlers() {
        $("a").not("#exorcist").prop("target", "_blank");

        $("a#exorcist").click(event => {
            event.preventDefault();
            showFilmDetails("US-DC");
        })

        $("#btnShowMap").click(() => showMap());
        $("#btnShowListStates").click(() => showListStates());
        $("#btnShowListMovies").click(() => showListMovies());
        $("#btnShowAbout").click(() => showAbout());

        $('#filmStateFlag').on({
            error: function () {
                $(this).hide();
            },
            load: function () {
                $(this).show();
            }
        });
    }

    function loadData(onLoaded) {
        _filmsSortedByState = [];
        _filmsSortedByTitle = [];
        _films = {};

        $.getJSON("data/films.json", filmsArray => {
            filmsArray.forEach(film => {
                film.colour = getRandomActiveMapColour();
                _films[film.stateCode] = film;
            });
            _filmsSortedByState = filmsArray.sortBy(SORT_FUNCTION.STATE);
            _filmsSortedByTitle = filmsArray.slice().sortBy(SORT_FUNCTION.TITLE);

            onLoaded();
        });
    }

    function initialiseMap() {
        _map = new jvm.Map({
            map: "us_aea",
            container: $("#map"),
            backgroundColor: MAP_BACKGROUND_COLOUR,
            zoomMin: 0.9,
            focusOn: {
                x: 0.5,
                y: 0.5,
                scale: 0.95
            },
            series: {
                regions: [{
                    attribute: "fill"
                }]
            },
            onRegionClick: (_, stateCode) => showFilmDetails(stateCode),
            onRegionTipShow: (_, tip, code) => {
                let film = _films[code];
                if (film) {
                    tip.text(`${film.state}: ${film.title} (${film.year})`);
                }
            }
        });

        // Set map colours
        _map.series.regions[0].setValues(getMapColours());
    }

    function uninitialiseMap() {
        if (_map) {
            _map.remove();
            _map = undefined;
        }
    }

    function initialiseStatesList() {
        initialiseList(
            "#listStates",
            _filmsSortedByState,
            BUTTON_TYPE.STATE);
    }

    function initialiseMoviesList() {
        initialiseList(
            "#listMovies",
            _filmsSortedByTitle,
            BUTTON_TYPE.TITLE);
    }

    function initialiseList(elementId, array, buttonType) {
        $(elementId).empty();
        array.forEach(film => $(elementId).append(buildMovieButton(film, buttonType)));
    }

    function buildMovieButton(film, buttonType) {
        return $("<span></span>")
            .addClass("filmButton")
            .prop({
                title: buttonType.getTip(film),
                style: `background-color: ${film.colour}`
            })
            .text(buttonType.getCaption(film))
            .click(() => showFilmDetails(film.stateCode))
            .prepend($("<img/>")
                .prop({
                    src: flagUrl(film),
                    alt: flagAltText(film)
                })
                .on("error", function () {
                    $(this).hide();
                })
            );
    }

    function getFilmState(film) {
        return film.state;
    }

    function getFilmTitleAndYear(film) {
        return `${film.title} (${film.year})`;
    }

    function initialiseCount() {
        $("#filmCount").text(_filmsSortedByState.length);
    }

    function initialiseStats() {
        initialiseStatsByDecade();
        initialiseStatsStateInTitle();
        initialiseStatsOldestNewest();
        initialiseStatsLongestShortestTitle();
    }

    function initialiseStatsByDecade() {
        let byDecade = {};
        _filmsSortedByState.forEach(film => {
            var decade = film.year.toString().slice(0, 3) + "0s";
            byDecade[decade] = (byDecade[decade] || 0) + 1;
        });

        const sortedKeys = Object.keys(byDecade).sort();
        const sortedValues = sortedKeys.map(x => byDecade[x]);

        let chartElement = $("#byDecade");
        new Chart(chartElement, {
            type: "bar",
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                },
                borderWidth: 1,
                scales: {
                    x: {
                        grid: {
                            color: CHART_BACKGROUND_LINE_COLOUR
                        },
                        ticks: {
                            color: CHART_FOREGROUND_LINE_COLOUR
                        }
                    },
                    y: {
                        grid: {
                            color: CHART_BACKGROUND_LINE_COLOUR
                        },
                        ticks: {
                            color: CHART_FOREGROUND_LINE_COLOUR
                        }
                    }
                }
            },
            data: {
                labels: sortedKeys,
                datasets: [{
                    label: "Total",
                    fill: true,
                    data: sortedValues,
                    backgroundColor: ACTIVE_MAP_COLOURS.slice(0, sortedKeys.length),
                    borderColor: CHART_FOREGROUND_LINE_COLOUR,
                    borderWidth: 1
                }]
            }
        });
    }

    function initialiseStatsStateInTitle() {
        _filmsSortedByTitle
            .filter(film => film.title.indexOf(film.state) > -1)
            .forEach(film => $("#stateInTitle").append(buildMovieButton(film, BUTTON_TYPE.TITLE)));
    }

    function initialiseStatsOldestNewest() {
        let filmsSortedByYear = _filmsSortedByTitle.slice().sortBy(SORT_FUNCTION.YEAR);

        $("#oldestNewest").append(
            buildMovieButton(filmsSortedByYear.shift(), BUTTON_TYPE.TITLE),
            buildMovieButton(filmsSortedByYear.pop(), BUTTON_TYPE.TITLE));
    }

    function initialiseStatsLongestShortestTitle() {
        let filmsSortedByTitleLength = _filmsSortedByTitle.slice().sortBy(SORT_FUNCTION.TITLE_LENGTH);

        $("#longestShortest").append(
            buildMovieButton(filmsSortedByTitleLength.shift(), BUTTON_TYPE.TITLE),
            buildMovieButton(filmsSortedByTitleLength.pop(), BUTTON_TYPE.TITLE));
    }

    function showMap() {
        selectButton("#btnShowMap");
        selectSection("#sectionMap");
        initialiseMap();
    }

    function showListStates() {
        selectButton("#btnShowListStates");
        selectSection("#sectionListStates");
        uninitialiseMap();
    }

    function showListMovies() {
        selectButton("#btnShowListMovies");
        selectSection("#sectionListMovies");
        uninitialiseMap();
    }

    function showAbout() {
        selectButton("#btnShowAbout");
        selectSection("#sectionAbout")
        uninitialiseMap();
    }

    function selectButton(selector) {
        $(selector)
            .addClass("selected")
            .siblings()
            .removeClass("selected");
    }

    function selectSection(selector) {
        $(selector)
            .show()
            .siblings()
            .hide();
    }

    function getMapColours() {
        let colours = {};
        for (let region in _map.regions) {
            colours[region] = _films[region]
                ? _films[region].colour
                : INACTIVE_MAP_COLOUR;
        }
        return colours;
    }

    function getRandomActiveMapColour() {
        let index = Math.floor(Math.random() * ACTIVE_MAP_COLOURS.length);
        return ACTIVE_MAP_COLOURS[index];
    }

    function showFilmDetails(stateCode) {
        let film = _films[stateCode];

        if (!film) {
            return;
        }

        $("#filmState").text(film.state);
        $("#filmTitle").text(film.title);
        $("#filmYear").text(film.year);
        $("#filmStateFlag")
            .prop({
                src: flagUrl(film),
                alt: flagAltText(film)
            });

        $("#filmImageContainer")
            .toggleClass("defaultImage", !film.image);
        $("#filmImage")
            .prop({
                src: film.image,
                alt: `Movie poster for ${film.title} (${film.year})`
            })
            .toggle(!!film.image);

        $("#filmOriginalTitle")
            .text(film.originalTitle)
            .toggle(!!film.originalTitle);

        $("#imdbLink").toggle(!!film.imdb).prop({href: `https://www.imdb.com/title/${film.imdb}/`});
        $("#letterboxdLink").toggle(!!film.letterboxd).prop({href: `https://letterboxd.com/film/${film.letterboxd}/`});
        $("#rottenTomatoesLink").toggle(!!film.rottenTomatoes).prop({href: `https://www.rottentomatoes.com/m/${film.rottenTomatoes}`});
        $("#wikipediaLink").toggle(!!film.wikipedia).prop({href: `https://en.wikipedia.org/wiki/${film.wikipedia}`});
        $("#justwatchLink").toggle(!!film.justwatch).prop({href: `https://www.justwatch.com/uk/movie/${film.justwatch}`});
        $("#trailerLink").toggle(!!film.trailer).prop({href: `https://youtu.be/${film.trailer}`});
        $("#reviewLink").toggle(!!film.review).prop({href: `https://youtu.be/${film.review}`});
        $("#filmReviewer").text(film.reviewer);
        $(".modal-header").css("background-color", film.colour);
        $("#filmDetailsModal").modal();
    }

    function flagUrl(film) {
        return film.stateCode === "US-DC"
            ? "https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Washington%2C_D.C.svg"
            : `https://flagcdn.com/${film.stateCode.toLowerCase()}.svg`;
    }

    function flagAltText(film) {
        return `State flag of ${film.state}`;
    }

    String.prototype.sortable = function () {
        return this.replace(/^(A|The) /, "");
    }

    Array.prototype.sortBy = function (sortFn) {
        return this.sort((a, b) => sortFn(a) < sortFn(b) ? -1 : sortFn(a) > sortFn(b) ? 1 : 0);
    }
});
