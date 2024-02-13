let app = new Vue({
    el: '#app',
    data: {
        showProduct: true,
        order: {
            name: '',
            phone: ''
        },
        lessons: [],
        cart: [],
        sortAttribute: '',
        sortOrder: '',
        searchQuery: ''
    },
    computed: {
        isOrderValid: function () {
            return this.order.name !== '' && /^[A-Za-z]*$/.test(this.order.name) && this.order.phone !== '' && /^[0-9]*$/.test(this.order.phone);
        },
        filteredAndSortedLessons: function () {
            let lessonsArray = this.lessons;
            if (this.searchQuery) {
                let lowerCaseQuery = this.searchQuery.toLowerCase();
                lessonsArray = lessonsArray.filter(lesson => lesson.subject.toLowerCase().includes(lowerCaseQuery) || lesson.location.toLowerCase().includes(lowerCaseQuery));
            }
            if (this.sortAttribute) {
                let sortOrder = (this.sortOrder === 'asc') ? 1 : -1;
                return lessonsArray.sort((a, b) => (a[this.sortAttribute] > b[this.sortAttribute]) ? sortOrder : -sortOrder);
            }
            return lessonsArray;
        }
    },
    methods: {
        toggleProductView: function () {
            this.showProduct = !this.showProduct;
        },
        addToCart: function (lesson) {
            this.cart.push(lesson._id);
            lesson.spaces--;
        },
        removeFromCart: function (lessonId) {
            const index = this.cart.indexOf(lessonId);
            if (index > -1) {
                this.cart.splice(index, 1);
                this.getLessonById(lessonId).spaces++;
            }
        },
        placeOrder: function () {
            if (this.isOrderValid) {
                fetch('http://localhost:3000/api/orders/place', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: this.order.name,
                        phone: this.order.phone,
                        lessonIds: this.cart,
                    }),
                })
                .then(response => response.json())
                .then(data => {
                    this.updateLessonSpaces();
                    alert('Order submitted!');
                    this.cart = [];
                    this.showProduct = true;
                    this.order = { name: '', phone: '' };
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('There was an error placing the order.');
                });
            }
        },
        updateLessonSpaces: function () {
            Promise.all(this.cart.map(lessonId => {
                const lesson = this.getLessonById(lessonId);
                return fetch(`http://localhost:3000/api/lessons/${lessonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        spaces: lesson.spaces,
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update lesson spaces');
                    }
                    return response.json();
                });
            }))
            .then(responses => {
                const hasError = responses.some(response => response.error);
                if (hasError) {
                    throw new Error('One or more lesson space updates failed');
                }
                alert('Lesson spaces updated successfully!');
                this.cart = [];
                this.order = { name: '', phone: '' };
                this.showProduct = true;
            })
            .catch(error => {
                console.error('Error updating lesson spaces:', error);
                alert('There was an error updating lesson spaces.');
            });
        },
        rateLesson: function (lesson, rating) {
            lesson.rating = rating;
        },
        getLessonById: function (lessonId) {
            return this.lessons.find(lesson => lesson._id === lessonId);
        },
        hasSpaces: function (lesson) {
            return lesson.spaces > 0;
        },
        fetchLessons: function () {
            fetch(`http://localhost:3000/api/lessons?q=${this.searchQuery}&sort=${this.sortAttribute}&order=${this.sortOrder}`)
                .then(response => response.json())
                .then(data => {
                    this.lessons = data.map(lesson => ({
                        ...lesson,
                        image: `http://localhost:3000${lesson.image}`
                    }));
                })
                .catch(error => console.error('Error fetching lessons:', error));
        }
    },
    mounted() {
        this.fetchLessons();
    }
});
