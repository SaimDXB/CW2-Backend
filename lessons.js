// Vue instance with data, computed properties, and methods
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
        searchQuery: '',
        baseURL: 'http://ed21test-env.eba-f3k3idms.eu-west-2.elasticbeanstalk.com' // Updated base URL
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
                fetch(`${this.baseURL}/api/orders/place`, {
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
                    this.updateLessonSpaces(); // Call the method to update lesson spaces
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
            // Send PUT request to update lesson spaces for each lesson in the cart
            Promise.all(this.cart.map(lessonId => {
                const lesson = this.getLessonById(lessonId);
                return fetch(`${this.baseURL}/api/lessons/${lessonId}`, {
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
                    return response.json(); // Return the response JSON if successful
                });
            }))
            .then(responses => {
                // Check if any responses indicate an error
                const hasError = responses.some(response => response.error);
                if (hasError) {
                    throw new Error('One or more lesson space updates failed');
                }
                // If all updates are successful, display a success message
                alert('Lesson spaces updated successfully!');
                // Clear the cart and reset the order form
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
            fetch(`${this.baseURL}/api/lessons?q=${this.searchQuery}&sort=${this.sortAttribute}&order=${this.sortOrder}`)
                .then(response => response.json())
                .then(data => {
                    console.log('Fetched lessons:', data); // Debug statement
                    this.lessons = data.map(lesson => ({
                        ...lesson,
                        // Prepend base URL to image path
                        image: `${this.baseURL}${lesson.image}`
                    }));
                })
                .catch(error => console.error('Error fetching lessons:', error));
        }
    },
    mounted() {
        // Fetch lessons from the backend when the component is mounted
        this.fetchLessons();
    }
});
