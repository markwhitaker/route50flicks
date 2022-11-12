"use strict";

$(function () {
    const MAP_BACKGROUND_COLOUR = "#f0f0f0";
    const INACTIVE_MAP_COLOUR = "#d0d0d0";
    const CHART_BACKGROUND_LINE_COLOUR = "#505050";
    const CHART_FOREGROUND_LINE_COLOUR = "#a0a0a0";
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
        TITLE: function (film) {
            return film.title.sortable();
        },
        TITLE_LENGTH: function (film) {
            return film.title.replaceAll(" ", "").length;
        },
        STATE: function (film) {
            return film.state;
        },
        YEAR: function (film) {
            return film.year;
        }
    });

    const FORMAT = Object.freeze({
        ALT_TEXT_FLAG: function (state) {
            return `State flag of ${state}`;
        },
        ALT_TEXT_POSTER: function (film) {
            return `Poster for ${film}`;
        },
        URL_FLAG: function (country) {
            return `https://flagcdn.com/${country}.svg`;
        },
        URL_IMDB: function (slug) {
            return `https://www.imdb.com/title/${slug}/`;
        },
        URL_JUST_WATCH: function (slug) {
            return `https://www.justwatch.com/uk/movie/${slug}`;
        },
        URL_LETTERBOXD: function (slug) {
            return `https://letterboxd.com/film/${slug}/`;
        },
        URL_ROTTEN_TOMATOES: function (slug) {
            return `https://www.rottentomatoes.com/m/${slug}`;
        },
        URL_WIKIPEDIA: function (slug) {
            return `https://en.wikipedia.org/wiki/${slug}`;
        },
        URL_YOUTUBE: function (slug) {
            return `https://www.youtube.com/watch?v=${slug}`;
        }
    });

    let _map;
    let _films = {};
    let _filmsSortedByState = [];
    let _filmsSortedByTitle = [];

    initialiseEventHandlers();

    loadData(function () {
        initialiseCount();
        initialiseMap();
        initialiseStatesList();
        initialiseMoviesList();
        initialiseStats();
    });

    //-----------------------------------------------------------

    function initialiseEventHandlers() {
        $("a").not("#exorcist").prop("target", "_blank");

        $("a#exorcist").click(function (event) {
            event.preventDefault();
            showFilmDetails("US-DC");
        })

        $("#btnShowMap").click(function () {
            showMap();
        });
        $("#btnShowListStates").click(function () {
            showListStates();
        });
        $("#btnShowListMovies").click(function () {
            showListMovies();
        });
        $("#btnShowAbout").click(function () {
            showAbout();
        });

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

        $.getJSON("data/films.json", function (filmsArray) {
            filmsArray.forEach(function (film) {
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
            onRegionClick: function (_, stateCode) {
                showFilmDetails(stateCode);
            },
            onRegionTipShow: function (_, tip, code) {
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

        array.forEach(function (film) {
            $(elementId).append(buildMovieButton(film, buttonType));
        });
    }

    function buildMovieButton(film, buttonType) {
        return $("<span></span>")
            .addClass("filmButton")
            .prop({
                title: buttonType.getTip(film),
                style: `background-color: ${film.colour}`
            })
            .text(buttonType.getCaption(film))
            .click(function () {
                showFilmDetails(film.stateCode);
            })
            .prepend($("<img/>")
                .prop({
                    src: flagUrl(film),
                    alt: FORMAT.ALT_TEXT_FLAG(film.state)
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
        _filmsSortedByState.forEach(function (film) {
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
                alt: FORMAT.ALT_TEXT_FLAG(film.state)
            });

        $("#filmImageContainer")
            .toggleClass("defaultImage", !film.image);
        $("#filmImage")
            .prop({
                src: film.image,
                alt: FORMAT.ALT_TEXT_POSTER(film.title)
            })
            .toggle(!!film.image);

        $("#filmOriginalTitle")
            .text(film.originalTitle)
            .toggle(!!film.originalTitle);

        setupButton("#imdbLink", FORMAT.URL_IMDB, film.imdb);
        setupButton("#letterboxdLink", FORMAT.URL_LETTERBOXD, film.letterboxd);
        setupButton("#rottenTomatoesLink", FORMAT.URL_ROTTEN_TOMATOES, film.rottenTomatoes);
        setupButton("#wikipediaLink", FORMAT.URL_WIKIPEDIA, film.wikipedia);
        setupButton("#justwatchLink", FORMAT.URL_JUST_WATCH, film.justwatch);
        setupButton("#trailerLink", FORMAT.URL_YOUTUBE, film.trailer);
        setupButton("#reviewLink", FORMAT.URL_YOUTUBE, film.review);

        $("#filmReviewer")
            .text(film.reviewer);

        $(".modal-header").css("background-color", film.colour);

        $("#filmDetailsModal").modal();
    }

    function setupButton(selector, urlFunction, value) {
        $(selector)
            .prop({
                href: urlFunction(value)
            })
            .toggle(!!value);
    }

    function flagUrl(film) {
        return film.stateCode === "US-DC"
            ? "https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_the_District_of_Columbia.svg"
            : FORMAT.URL_FLAG(film.stateCode.toLowerCase());
    }

    String.prototype.sortable = function () {
        return this.replace(/^(A|The) /, "");
    }

    Array.prototype.sortBy = function (sortFunction) {
        return this.sort(function (a, b) {
            return sortFunction(a) < sortFunction(b) ? -1 : sortFunction(a) > sortFunction(b) ? 1 : 0
        });
    }
});
