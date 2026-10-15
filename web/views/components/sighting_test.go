package components_test

import (
	"testing"
	"workshop/web/views/components"

	"github.com/stretchr/testify/assert"
)

func TestSized(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		in, size, want string
	}{
		"iNaturalist original": {
			in:   "https://inaturalist-open-data.s3.amazonaws.com/photos/1/original.jpg",
			size: "medium",
			want: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg",
		},
		"iNaturalist already sized": {
			in:   "https://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpeg",
			size: "medium",
			want: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpeg",
		},
		"Other host": {
			in:   "https://observation.org/photos/original.jpg",
			size: "medium",
			want: "https://observation.org/photos/original.jpg",
		},
		"Not a URL": {
			in:   "::",
			size: "medium",
			want: "::",
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, test.want, components.Sized(test.in, test.size))
		})
	}
}
